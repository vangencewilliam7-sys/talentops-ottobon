import { supabase } from '../../../lib/supabaseClient';
import { calculateDueDateTime } from '../../../lib/businessHoursUtils';
import { sendNotification, sendBulkNotifications } from '../../notificationService';

/**
 * Task Mutations
 * Handles create, update, delete operations.
 */

// ... existing imports

export const requestTaskAccess = async (taskId, orgId, reason, currentUserId, assignedByUserId, taskTitle) => {
    const { error } = await supabase
        .from('tasks')
        .update({
            access_requested: true,
            access_reason: reason,
            access_requested_at: new Date().toISOString(),
            access_status: 'pending'
        })
        .eq('id', taskId)
        .eq('org_id', orgId);

    if (error) throw error;

    // Notify Manager
    if (assignedByUserId) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', currentUserId).eq('org_id', orgId).single();
        const senderName = profile?.full_name || 'Someone';

        await sendNotification(
            assignedByUserId,
            currentUserId,
            senderName,
            `Access requested for task: ${taskTitle}`,
            'access_requested'
        );
    }
    return true;
};

export const resolveTaskIssue = async (task, user, orgId) => {
    // Get user profile for name (Self-contained fetch to avoid passing extra params if possible, or pass userName)
    // For efficiency, better to pass userName, but following existing pattern for safety
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .eq('org_id', orgId)
        .single();

    const userName = profile?.full_name || profile?.email || 'Manager';
    const timestamp = new Date().toISOString();

    const resolutionEntry = `\n\n[${new Date(timestamp).toLocaleString()}] RESOLVED by ${userName}`;
    const updatedIssues = (task.issues || '') + resolutionEntry;

    const { error } = await supabase
        .from('tasks')
        .update({
            issues: updatedIssues,
            updated_at: timestamp
        })
        .eq('id', task.id)
        .eq('org_id', orgId);

    if (error) throw error;
    return true;
};

export const updateTask = async (taskId, updates, orgId) => {
    // Fetch task to get assignee and title before update, constrained by orgId
    const { data: task } = await supabase
        .from('tasks')
        .select('assigned_to, assigned_by, title')
        .eq('id', taskId)
        .eq('org_id', orgId)
        .single();

    if (!task) throw new Error('Task not found or access denied');

    const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('org_id', orgId);
        
    if (error) throw error;

    // Notify Assignee of the update
    if (task && task.assigned_to) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', task.assigned_by || '')
            .eq('org_id', orgId)
            .single();
            
        const senderName = profile?.full_name || 'Manager';

        await sendNotification(
            task.assigned_to,
            task.assigned_by || '',
            senderName,
            `Task updated: ${task.title}`,
            'task_updated',
            orgId
        );
    }

    return true;
};

export const deleteTask = async (taskId, orgId) => {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('org_id', orgId);
    if (error) throw error;
    return true;
};

export const archiveTask = async (taskId, orgId) => {
    const { error } = await supabase
        .from('tasks')
        .update({ status: 'archived' })
        .eq('id', taskId)
        .eq('org_id', orgId);
    if (error) throw error;
    return true;
};

/**
 * Upload phase guidance files.
 * @param {object} phaseFiles - Map of phaseKey -> File object
 * @param {string} projectId - Project ID
 * @returns {Promise<object>} Map of phaseKey -> { guidance_doc_url, guidance_doc_name }
 */
export const uploadGuidanceFiles = async (phaseFiles, projectId) => {
    const guidanceData = {};
    const uploadPromises = Object.entries(phaseFiles).map(async ([phaseKey, file]) => {
        if (!file) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `guidance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `guidance/${projectId || 'general'}/${phaseKey}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('project-docs')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
            console.error(`Failed to upload guidance for ${phaseKey}`, uploadError);
            return;
        }

        const { data: urlData } = supabase.storage.from('project-docs').getPublicUrl(filePath);

        guidanceData[phaseKey] = {
            guidance_doc_url: urlData.publicUrl,
            guidance_doc_name: file.name
        };
    });

    await Promise.all(uploadPromises);
    return guidanceData;
};

/**
 * Create a new Task (or multiple tasks)
 * Encapsulates logic for: 
 * - Single/Multi assignment
 * - File uploads (guidance) - handled via passed filtered params
 * - Task insertion
 * - Step insertion
 * - Notification insertion
 * 
 * @param {object} params
 * @param {object} params.newTask - Task form data
 * @param {object} params.user - Current user object
 * @param {string} params.orgId
 * @param {string} params.effectiveProjectId
 * @param {string} params.senderName
 * @param {object} params.taskStepsToAdd - Steps map
 * @param {Array} params.employees - Employee list (for multi-assign notifications)
 * @param {object} params.preparedValidations - Validations object with guidance links
 */
export const createTask = async ({
    newTask,
    user,
    orgId,
    effectiveProjectId,
    senderName,
    taskStepsToAdd,
    employees,
    preparedValidations,
    aiMetadata  // NEW: AI planning metadata (risks, assumptions, model)
}) => {
    try {
        if (newTask.assignType === 'multi') {
            if (newTask.selectedAssignees.length === 0) {
                throw new Error('Please select at least one employee');
            }

            // Calculate due date/time based on allocated hours and business hours
            const allocatedHrs = parseFloat(newTask.allocatedHours) || 0;
            const startDateStr = `${newTask.startDate}T${newTask.startTime}`;
            const { dueDate, dueTime } = calculateDueDateTime(new Date(startDateStr), allocatedHrs);

            const tasksToInsert = newTask.selectedAssignees.map(empId => ({
                title: newTask.title,
                description: newTask.description,
                assigned_to: empId || null,
                assigned_by: user.id,
                assigned_by_name: senderName,
                project_id: effectiveProjectId || null,
                start_date: newTask.startDate,
                start_time: newTask.startTime,
                due_date: dueDate,
                due_time: dueTime,
                priority: newTask.priority.toLowerCase(),
                status: 'pending',
                phase_validations: preparedValidations,
                org_id: orgId,
                allocated_hours: allocatedHrs,
                risk_tag: newTask.riskTag,
                skills: newTask.skills || [],
                ...(aiMetadata ? { ai_metadata: aiMetadata } : {})
            }));

            const { data: createdMultiTasks, error: multiTaskError } = await supabase.from('tasks').insert(tasksToInsert).select('id');
            if (multiTaskError) throw multiTaskError;

            // Insert manager-defined steps for all created tasks
            if (createdMultiTasks && createdMultiTasks.length > 0) {
                const allStepsToInsert = [];

                createdMultiTasks.forEach(createdTask => {
                    Object.entries(taskStepsToAdd).forEach(([phaseKey, steps]) => {
                        steps.forEach((step, idx) => {
                            if (step.title.trim()) {
                                allStepsToInsert.push({
                                    org_id: orgId,
                                    task_id: createdTask.id,
                                    stage_id: phaseKey,
                                    step_title: step.title.trim(),
                                    order_index: idx,
                                    status: 'pending',
                                    created_by: user.id,
                                    created_by_role: 'manager',
                                    estimated_hours: step.hours || 2
                                });
                            }
                        });
                    });
                });

                if (allStepsToInsert.length > 0) {
                    const { error: stepsError } = await supabase.from('task_steps').insert(allStepsToInsert);
                    if (stepsError) console.error('Error inserting steps for multi-assign:', stepsError);
                }
            }

            // Notifications for multi
            const assigneeIds = tasksToInsert.map(t => t.assigned_to).filter(Boolean);
            if (assigneeIds.length > 0) {
                await sendBulkNotifications(
                    assigneeIds,
                    user.id,
                    senderName,
                    `New task assigned: ${newTask.title}`,
                    'task_assigned'
                );
            }

            return createdMultiTasks;

        } else {
            // SINGLE ASSIGNMENT
            const allocatedHrs = parseFloat(newTask.allocatedHours) || 0;
            const startDateStr = `${newTask.startDate}T${newTask.startTime}`;
            const { dueDate, dueTime } = calculateDueDateTime(new Date(startDateStr), allocatedHrs);

            const taskToInsert = {
                title: newTask.title,
                description: newTask.description,
                assigned_to: newTask.assignType === 'individual' && newTask.assignedTo ? newTask.assignedTo : null,
                assigned_by: user.id,
                assigned_by_name: senderName,
                project_id: effectiveProjectId || null,
                start_date: newTask.startDate,
                start_time: newTask.startTime,
                due_date: dueDate,
                due_time: dueTime,
                priority: newTask.priority.toLowerCase(),
                status: 'pending',
                phase_validations: preparedValidations,
                org_id: orgId,
                allocated_hours: allocatedHrs,
                risk_tag: newTask.riskTag,
                skills: newTask.skills || [],
                ...(aiMetadata ? { ai_metadata: aiMetadata } : {})
            };

            const { data: createdTasks, error: taskError } = await supabase.from('tasks').insert([taskToInsert]).select('id');
            if (taskError) throw taskError;

            // Insert manager-defined steps for this task
            if (createdTasks && createdTasks.length > 0) {
                const taskId = createdTasks[0].id;
                const stepsToInsert = [];

                Object.entries(taskStepsToAdd).forEach(([phaseKey, steps]) => {
                    steps.forEach((step, idx) => {
                        if (step.title.trim()) {
                            stepsToInsert.push({
                                org_id: orgId,
                                task_id: taskId,
                                stage_id: phaseKey,
                                step_title: step.title.trim(),
                                order_index: idx,
                                status: 'pending',
                                created_by: user.id,
                                created_by_role: 'manager',
                                estimated_hours: step.hours || 2
                            });
                        }
                    });
                });

                if (stepsToInsert.length > 0) {
                    const { error: stepsError } = await supabase.from('task_steps').insert(stepsToInsert);
                    if (stepsError) console.error('Error inserting steps:', stepsError);
                }
            }

            // Send Notifications
            try {
                if (newTask.assignType === 'individual' && newTask.assignedTo) {
                    await sendNotification(
                        newTask.assignedTo,
                        user.id,
                        senderName,
                        `New task assigned: ${newTask.title}`,
                        'task_assigned'
                    );
                } else if (newTask.assignType === 'team' && employees.length > 0) {
                    const empIds = employees.map(e => e.id);
                    await sendBulkNotifications(
                        empIds,
                        user.id,
                        senderName,
                        `New team task created: ${newTask.title}`,
                        'task_assigned'
                    );
                }
            } catch (notifyError) {
                console.error('Error sending notification:', notifyError);
            }

            return createdTasks;
        }
    } catch (error) {
        console.error('Service: Error creating task:', error);
        throw error;
    }
};

export const addTaskStep = async (step, orgId) => {
    const stepWithOrg = { ...step, org_id: orgId || step.org_id };
    const { data, error } = await supabase.from('task_steps').insert(stepWithOrg).select();
    if (error) throw error;
    return data[0];
};

export const updateTaskStep = async (stepId, updates, orgId) => {
    let query = supabase.from('task_steps').update(updates).eq('id', stepId);
    if (orgId) query = query.eq('org_id', orgId);
    
    const { data, error } = await query.select();
    if (error) throw error;
    return data[0];
};

export const deleteTaskStep = async (stepId, orgId) => {
    let query = supabase.from('task_steps').delete().eq('id', stepId);
    if (orgId) query = query.eq('org_id', orgId);
    
    const { error } = await query;
    if (error) throw error;
    return true;
};
