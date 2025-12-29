-- ============================================================================
-- TALENTOPS TASK INTELLIGENCE SYSTEM - COMPLETE SETUP
-- ============================================================================
-- Run this entire script in your Supabase SQL Editor
-- Order: Tables → Triggers → Functions
-- ============================================================================


-- ============================================================================
-- PART 1: WORK INTELLIGENCE ENGINE (Tables & Policies)
-- ============================================================================

-- 1. Safely add columns to 'tasks' only if they don't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'team_id') then
        alter table public.tasks add column team_id uuid;
    end if;
end $$;

-- 2. Create new tables
create table if not exists public.task_blueprint (
  task_id uuid references public.tasks(id) on delete cascade primary key,
  expected_deliverables text,
  expected_screenshots int default 0,
  min_files int default 0,
  estimated_hours numeric,
  weight_rule text,
  auto_approval_allowed boolean default false,
  delay_penalty_percent numeric default 0,
  business_impact_type text,
  created_at timestamptz default now()
);

create table if not exists public.task_submissions (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade,
  employee_id uuid references auth.users(id),
  description text,
  submission_time timestamptz default now()
);

create table if not exists public.task_evidence (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid references public.task_submissions(id) on delete cascade,
  file_url text not null,
  file_type text,
  proof_score numeric default 0,
  uploaded_at timestamptz default now()
);

create table if not exists public.task_progress (
  task_id uuid references public.tasks(id) on delete cascade primary key,
  completion_percent numeric default 0,
  confidence_score numeric default 0,
  authenticity_score numeric default 0,
  risk_flag boolean default false,
  last_updated timestamptz default now()
);

create table if not exists public.task_reviews (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade,
  reviewer_id uuid references auth.users(id),
  comment text,
  approved boolean,
  reviewed_at timestamptz default now()
);

-- 3. Enable RLS on new tables
alter table public.task_blueprint enable row level security;
alter table public.task_submissions enable row level security;
alter table public.task_evidence enable row level security;
alter table public.task_progress enable row level security;
alter table public.task_reviews enable row level security;

-- 4. Create Policies
do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'task_blueprint' and policyname = 'Enable access for authenticated users') then
        create policy "Enable access for authenticated users" on public.task_blueprint for all using (auth.role() = 'authenticated');
    end if;

    if not exists (select 1 from pg_policies where tablename = 'task_submissions' and policyname = 'Enable access for authenticated users') then
        create policy "Enable access for authenticated users" on public.task_submissions for all using (auth.role() = 'authenticated');
    end if;

    if not exists (select 1 from pg_policies where tablename = 'task_evidence' and policyname = 'Enable access for authenticated users') then
        create policy "Enable access for authenticated users" on public.task_evidence for all using (auth.role() = 'authenticated');
    end if;

    if not exists (select 1 from pg_policies where tablename = 'task_progress' and policyname = 'Enable access for authenticated users') then
        create policy "Enable access for authenticated users" on public.task_progress for all using (auth.role() = 'authenticated');
    end if;

    if not exists (select 1 from pg_policies where tablename = 'task_reviews' and policyname = 'Enable access for authenticated users') then
        create policy "Enable access for authenticated users" on public.task_reviews for all using (auth.role() = 'authenticated');
    end if;
end $$;


-- ============================================================================
-- PART 2: AUTO CALCULATION ENGINE (Triggers)
-- ============================================================================

-- Calculation Logic Function
create or replace function calculate_task_scores_trigger()
returns trigger as $$
declare
    t_task_id uuid;
    t_submission_id uuid;
    r_min_files int;
    r_delay_penalty numeric;
    r_weight_rule text;
    d_file_count int;
    d_desc_length int;
    d_due_date timestamptz;
    calc_confidence numeric;
    calc_proof numeric;
    calc_completion numeric;
    calc_risk boolean;
    is_late boolean;
begin
    if TG_TABLE_NAME = 'task_submissions' then
        t_task_id := NEW.task_id;
        t_submission_id := NEW.id;
    elsif TG_TABLE_NAME = 'task_evidence' then
        select task_id into t_task_id from public.task_submissions where id = NEW.submission_id;
        t_submission_id := NEW.submission_id;
    end if;

    -- Get Blueprint Rules
    select min_files, delay_penalty_percent, weight_rule 
    into r_min_files, r_delay_penalty, r_weight_rule
    from public.task_blueprint 
    where task_id = t_task_id;
    
    if r_min_files is null then r_min_files := 1; end if;
    if r_delay_penalty is null then r_delay_penalty := 0; end if;

    -- Get Task Deadline
    select due_date into d_due_date from public.tasks where id = t_task_id;

    -- Analyze Evidence
    select count(*) into d_file_count from public.task_evidence where submission_id = t_submission_id;
    
    select coalesce(length(description), 0) into d_desc_length 
    from public.task_submissions 
    where id = t_submission_id;

    -- Calculate Confidence Score
    if r_min_files > 0 then
        calc_confidence := (d_file_count::numeric / r_min_files::numeric) * 100;
        if calc_confidence > 100 then calc_confidence := 100; end if;
    else
        calc_confidence := 100;
    end if;

    -- Risk Flag
    is_late := (now() > d_due_date);
    calc_risk := is_late OR (calc_confidence < 50);

    -- Completion Percent
    calc_proof := 0;
    if d_desc_length > 20 then calc_proof := 100; else calc_proof := 20; end if;
    
    calc_completion := (calc_confidence * 0.7) + (calc_proof * 0.3);
    
    if is_late then
        calc_completion := calc_completion - r_delay_penalty;
    end if;
    
    if calc_completion < 0 then calc_completion := 0; end if;

    -- Insert/Update Task Progress
    insert into public.task_progress (task_id, completion_percent, confidence_score, authenticity_score, risk_flag, last_updated)
    values (t_task_id, calc_completion, calc_confidence, 85, calc_risk, now())
    on conflict (task_id) do update set
        completion_percent = excluded.completion_percent,
        confidence_score = excluded.confidence_score,
        risk_flag = excluded.risk_flag,
        last_updated = now();

    return NEW;
end;
$$ language plpgsql;

-- Create Triggers
do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'on_submission_created') then
        create trigger on_submission_created
        after insert on public.task_submissions
        for each row execute function calculate_task_scores_trigger();
    end if;

    if not exists (select 1 from pg_trigger where tgname = 'on_evidence_added') then
        create trigger on_evidence_added
        after insert on public.task_evidence
        for each row execute function calculate_task_scores_trigger();
    end if;

    if not exists (select 1 from pg_trigger where tgname = 'on_evidence_removed') then
        create trigger on_evidence_removed
        after delete on public.task_evidence
        for each row execute function calculate_task_scores_trigger();
    end if;
end $$;


-- ============================================================================
-- PART 3: TRUST PASSPORT SYSTEM (Employee Scoring)
-- ============================================================================

create or replace function get_employee_trust_profile(emp_id uuid)
returns json as $$
declare
  total_tasks int;
  certified_tasks int;
  avg_confidence numeric;
  risk_flags int;
  overdue_tasks int;
  rejected_tasks int;
  rejection_rate numeric;
  trust_score numeric;
  tasks_assigned int;
begin
  select count(*) into tasks_assigned from public.tasks where assigned_to = emp_id;
  
  if tasks_assigned = 0 then
    return json_build_object(
      'trust_score', 0,
      'certified_percent', 0,
      'avg_confidence', 0,
      'risk_flags', 0,
      'overdue_count', 0,
      'rejection_rate', 0
    );
  end if;

  select count(tp.task_id) into certified_tasks
  from public.task_progress tp
  join public.tasks t on t.id = tp.task_id
  where t.assigned_to = emp_id and tp.completion_percent >= 100;

  select coalesce(avg(tp.confidence_score), 0) into avg_confidence
  from public.task_progress tp
  join public.tasks t on t.id = tp.task_id
  where t.assigned_to = emp_id;

  select count(tp.task_id) into risk_flags
  from public.task_progress tp
  join public.tasks t on t.id = tp.task_id
  where t.assigned_to = emp_id and tp.risk_flag = true;

  select count(*) into overdue_tasks
  from public.tasks
  where assigned_to = emp_id 
  and due_date < now() 
  and status not in ('completed', 'done', 'cancelled');

  select count(distinct task_id) into rejected_tasks
  from public.task_reviews
  where task_id in (select id from public.tasks where assigned_to = emp_id)
  and approved = false;

  rejection_rate := (rejected_tasks::numeric / tasks_assigned::numeric) * 100;

  trust_score := 50 + 
                 ((certified_tasks::numeric / tasks_assigned::numeric) * 30) + 
                 (avg_confidence * 0.2);
                 
  trust_score := trust_score - (risk_flags * 5) - (rejected_tasks * 3) - (overdue_tasks * 2);
  
  if trust_score < 0 then trust_score := 0; end if;
  if trust_score > 100 then trust_score := 100; end if;

  return json_build_object(
    'trust_score', round(trust_score),
    'certified_percent', round((certified_tasks::numeric / tasks_assigned::numeric) * 100),
    'avg_confidence', round(avg_confidence),
    'risk_flags', risk_flags,
    'overdue_count', overdue_tasks,
    'rejection_rate', round(rejection_rate)
  );
end;
$$ language plpgsql;


-- ============================================================================
-- PART 4: AUDIT VAULT (Immutable Task Certification Ledger)
-- ============================================================================

create table if not exists public.task_audit_ledger (
    audit_id uuid default gen_random_uuid() primary key,
    task_id uuid not null references public.tasks(id),
    project_name text,
    task_title text not null,
    employee_id uuid,
    reviewer_id uuid,
    certified_at timestamptz default now(),
    proofs_snapshot jsonb,
    scores_snapshot jsonb,
    risk_snapshot jsonb,
    review_snapshot jsonb,
    ledger_hash text,
    unique(task_id)
);

alter table public.task_audit_ledger enable row level security;

-- Allow View
do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'task_audit_ledger' and policyname = 'Enable read access for authenticated users') then
        create policy "Enable read access for authenticated users" 
        on public.task_audit_ledger for select 
        using (auth.role() = 'authenticated');
    end if;

    if not exists (select 1 from pg_policies where tablename = 'task_audit_ledger' and policyname = 'Enable insert for authenticated users') then
        create policy "Enable insert for authenticated users" 
        on public.task_audit_ledger for insert 
        with check (auth.role() = 'authenticated');
    end if;
end $$;

-- Archive Function
create or replace function archive_certified_task(
    p_task_id uuid,
    p_reviewer_id uuid
)
returns json as $$
declare
    v_task record;
    v_progress record;
    v_latest_review record;
    v_proofs jsonb;
    v_scores jsonb;
    v_risks jsonb;
    v_review_data jsonb;
    v_hash text;
    v_audit_id uuid;
begin
    select * into v_task from public.tasks where id = p_task_id;
    if not found then raise exception 'Task not found'; end if;

    select * into v_progress from public.task_progress where task_id = p_task_id;
    
    v_scores := json_build_object(
        'completion_percent', coalesce(v_progress.completion_percent, 0),
        'confidence_score', coalesce(v_progress.confidence_score, 0),
        'authenticity_score', coalesce(v_progress.authenticity_score, 0)
    );
    
    v_risks := json_build_object(
        'risk_flag', coalesce(v_progress.risk_flag, false)
    );

    select json_agg(json_build_object(
        'file_url', te.file_url,
        'uploaded_at', te.uploaded_at,
        'proof_score', te.proof_score
    )) into v_proofs
    from public.task_evidence te
    join public.task_submissions ts on ts.id = te.submission_id
    where ts.task_id = p_task_id;

    select * into v_latest_review 
    from public.task_reviews 
    where task_id = p_task_id 
    order by reviewed_at desc limit 1;
    
    v_review_data := json_build_object(
        'comment', v_latest_review.comment,
        'approved_at', v_latest_review.reviewed_at
    );

    v_hash := md5(p_task_id::text || now()::text || 'TalentOps-Certified');

    insert into public.task_audit_ledger (
        task_id, project_name, task_title, employee_id, reviewer_id,
        proofs_snapshot, scores_snapshot, risk_snapshot, review_snapshot, ledger_hash
    ) values (
        p_task_id, 'TalentOps Project', v_task.title, v_task.assigned_to, p_reviewer_id,
        coalesce(v_proofs, '[]'::jsonb), v_scores, v_risks, v_review_data, v_hash
    ) returning audit_id into v_audit_id;

    return json_build_object('success', true, 'audit_id', v_audit_id);
end;
$$ language plpgsql;


-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
