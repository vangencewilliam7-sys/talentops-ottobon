import uvicorn
import os
import nest_asyncio
import json
import re
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pyngrok import ngrok
from together import Together
from datetime import datetime, timezone, timedelta
import guardrails
import sql_gen

# Indian Standard Time (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

# Apply nest_asyncio to allow running Uvicorn in Jupyter/Colab environments
nest_asyncio.apply()

# ==========================================
# 1. CONFIGURATION & CREDENTIALS
# ==========================================
TOGETHER_API_KEY = "47d98fe83c34e32dc11956105d92a5f2ca6673baa837f9655f5d334057a5e773"
FINE_TUNED_MODEL_NAME = "ashwadh8888_cc27/Meta-Llama-3.1-8B-Instruct-Reference-talent_ops-e0fe854f" 
NGROK_AUTHTOKEN = "33ESMwF0XQ3gaYcXatTvnsZyOh5_44XcqY6xFDJGK4KU5Sori"

SUPABASE_URL = "https://ppptzmmecvjuvbulvddh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwcHR6bW1lY3ZqdXZidWx2ZGRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY0NDU5OSwiZXhwIjoyMDc5MjIwNTk5fQ.xR215A_WvpdLKoJQt20FQYaQFSBBchTxh2Mb-fX2-s4"

PORT = 8035 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
client = Together(api_key=TOGETHER_API_KEY)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# ==========================================
# CUSTOM LIGHTWEIGHT SUPABASE CLIENT
# (Replaces supabase-py to avoid dependency issues)
# ==========================================
class SimpleSupabaseClient:
    def __init__(self, url, key):
        self.url = url
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
        
    def table(self, name):
        # Create a COPY of headers to avoid pollution
        return SimpleSupabaseQuery(self.url, dict(self.headers), name)
    
    def rpc(self, name, params):
        url = f"{self.url}/rest/v1/rpc/{name}"
        resp = requests.post(url, headers=self.headers, json=params)
        
        class Response:
            def __init__(self, data):
                self.data = data
        
        if resp.status_code == 200:
            return Response(resp.json())
        return Response([])

class SimpleSupabaseQuery:
    def __init__(self, base_url, headers, table):
        self.url = f"{base_url}/rest/v1/{table}"
        self.headers = headers
        self.params = {}
        self.method = "GET"
        self.json_data = None

    def select(self, *columns):
        self.method = "GET"
        cols = ",".join(columns) if columns else "*"
        self.params["select"] = cols
        return self

    def eq(self, column, value):
        self.params[f"{column}"] = f"eq.{value}"
        return self

    def ilike(self, column, value):
        self.params[f"{column}"] = f"ilike.{value}"
        return self

    def is_(self, column, value):
        # PostgREST uses 'is.null' or 'is.true' etc.
        self.params[f"{column}"] = f"is.{value}"
        return self

    def neq(self, column, value):
        self.params[f"{column}"] = f"neq.{value}"
        return self
        
    def limit(self, count):
        self.headers["Range-Unit"] = "items"
        self.headers["Range"] = f"0-{count-1}" 
        self.params["limit"] = count
        return self
        
    def order(self, column, desc=False):
        direction = "desc" if desc else "asc"
        self.params["order"] = f"{column}.{direction}"
        return self

    def insert(self, data):
        self.method = "POST"
        self.json_data = data
        self.headers["Prefer"] = "return=representation"
        return self

    def update(self, data):
        self.method = "PATCH"
        self.json_data = data
        self.headers["Prefer"] = "return=representation"
        return self

    def execute(self):
        try:
            if self.method == "GET":
                resp = requests.get(self.url, headers=self.headers, params=self.params)
            elif self.method == "POST":
                resp = requests.post(self.url, headers=self.headers, json=self.json_data, params=self.params)
            elif self.method == "PATCH":
                resp = requests.patch(self.url, headers=self.headers, json=self.json_data, params=self.params)
            
            if resp.status_code >= 400:
                print(f"Supabase ERROR {resp.status_code}: {resp.text}")
            resp.raise_for_status()
            
            # Mock the response object to match supabase-py structure
            class Response:
                def __init__(self, data):
                    self.data = data
            
            return Response(resp.json())
        except Exception as e:
            print(f"Supabase Request Error: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"Supabase Error Body: {e.response.text}")
            class Response:
                def __init__(self, data):
                    self.data = data
            return Response([])
            return Response([])

supabase = SimpleSupabaseClient(SUPABASE_URL, SUPABASE_KEY)

# ==========================================
# 2. DATABASE TABLES & COLUMNS
# ==========================================
TABLE_SCHEMAS = {
    "announcements": ["teams", "event_time", "location", "title", "id", "created_at", "message", "event_for", "event_date", "employees"],
    "attachments": ["org_id", "file_size", "created_at", "file_name", "storage_path", "mime_type", "id", "message_id"],
    "attendance": ["id", "date", "team_id", "current_task", "employee_id", "clock_in", "total_hours", "clock_out"],
    "audit_log": ["entity", "user_id", "entity_id", "action", "details", "timestamp", "changes", "id"],
    "candidates": ["resume_uploaded_at", "job_title", "stage", "resume_url", "resume_name", "status", "notes", "source", "created_at", "updated_at", "applied_date", "resume_size", "job_id", "id", "phone", "skills", "experience", "email", "name"],
    "clients": ["postal_code", "country", "updated_at", "user_id", "created_at", "id", "state", "gst_no", "company_name", "address", "city", "phone", "email", "name", "is_active"],
    "company_settings": ["company_address", "company_phone", "company_website", "logo_url", "id", "created_at", "updated_at", "company_name", "company_email"],
    "conversation_indexes": ["last_message_at", "conversation_id", "last_message_id"],
    "conversation_members": ["id", "org_id", "conversation_id", "user_id", "last_read_at", "created_at", "status"],
    "conversations": ["team_id", "org_id", "id", "type", "created_at", "created_by"],
    "departments": ["id", "department_name"],
    "employee_finance": ["id", "effective_from", "updated_at", "created_at", "is_active", "change_reason", "employee_id", "hra", "allowances", "basic_salary", "effective_to"],
    "expenses": ["reason", "employee_id", "amount", "id", "team_id", "date", "bill_url", "category", "status"],
    "feedback": ["interviewer_id", "interviewer_name", "recommendation", "id", "candidate_id", "interview_id", "ratings", "comments", "submitted_at"],
    "interviews": ["candidate_name", "job_title", "panel_type", "interviewers", "mode", "meeting_link", "status", "created_at", "duration", "scheduled_at", "job_id", "candidate_id", "id", "notes"],
    "invoice_emails": ["sent_at", "invoice_id", "sent_to", "status", "error_message", "id"],
    "invoice_items": ["rate", "invoice_id", "id", "amount", "description", "quantity"],
    "invoice_templates": ["type", "updated_at", "id", "user_id", "is_default", "created_at", "description", "is_active", "preview_url", "file_path", "name"],
    "invoices": ["currency", "id", "client_id", "created_by", "invoice_date", "due_date", "subtotal", "tax_percent", "tax_amount", "total_amount", "created_at", "template_id", "status", "pdf_url", "notes", "invoice_number"],
    "job_descriptions": ["id", "role", "created_at", "job_description"],
    "jobs": ["title", "applicants", "status", "id", "description", "skills", "created_by", "location", "experience", "department", "updated_at", "created_at"],
    "leaves": ["to_date", "from_date", "employee_id", "status", "reason", "id", "team_id"],
    "messages": ["sender_user_id", "id", "org_id", "conversation_id", "created_at", "sender_type", "deleted_at", "edited_at", "message_type", "body"],
    "notifications": ["id", "type", "message", "created_at", "is_read", "data", "receiver_name", "sender_name", "sender_id", "receiver_id"],
    "offers": ["status", "candidate_name", "benefits", "created_at", "updated_at", "position", "id", "job_title", "start_date", "job_id", "candidate_id", "location", "equity", "salary", "department"],
    "orgs": ["name", "id", "created_at"],
    "payroll": ["status", "month", "created_at", "generated_by", "net_salary", "lop_days", "deductions", "allowances", "hra", "basic_salary", "employee_id", "id"],
    "payslip_templates": ["updated_at", "created_at", "id", "created_by", "template_html", "template_name", "is_default"],
    "payslips": ["month", "storage_url", "payslip_number", "created_at", "created_by", "template_id", "amount", "status", "employee_id", "id"],
    "performance_reviews": ["id", "comments", "score", "reviewer_id", "employee_id"],
    "policies": ["file_url", "status", "title", "category", "id", "created_at", "effective_date"],
    "profiles": ["role", "created_at", "team_id", "id", "full_name", "monthly_leave_quota", "leaves_remaining", "email", "join_date", "avatar_url", "location", "phone", "leaves_taken_this_month"],
    "projects": ["name", "id", "owner_id"],
    "tasks": ["due_time", "assigned_by_name", "assigned_to_name", "status", "priority", "description", "title", "id", "assigned_to", "assigned_by", "project_id", "team_id", "start_date", "due_date"],
    "team_memberships": ["created_at", "status", "team_id", "user_id", "org_id", "id"],
    "teams": ["team_name", "id", "manager_id"],
    "timesheets": ["employee_id", "id", "date", "hours"],
    "users": ["role", "created_at", "email", "id", "name"]
}

# ==========================================
# 3. ACTION MAPPING (Bot Commands -> Tables)
# ==========================================
ACTION_MAPPING = {
    # 👑 Executive (Highest Authority)
    "create_department": "departments",
    "assign_manager": "profiles",
    "add_employee": "profiles",
    "create_employee": "profiles",
    "approve_any_leave": "leaves",
    "reject_any_leave": "leaves",
    "upload_payslip": "payroll",
    "post_announcement": "announcements",
    "configure_policy": "policies",
    "access_ai_insights": "profiles", # Representative

    # 🏢 Manager (Department Authority)
    "create_team": "teams",
    "assign_team_lead": "profiles",
    "add_dept_employee": "profiles",
    "manager_approve_leave": "leaves",
    "manager_reject_leave": "leaves",
    "assign_task": "tasks",
    "create_task": "tasks",
    "view_dept_analytics": "profiles",

    # 👥 Team Lead (Team Authority)
    "view_team_attendance": "attendance",
    "view_team_tasks": "tasks",
    "view_team_leaves": "leaves",
    "view_team_timesheets": "timesheets",
    "give_performance_feedback": "profiles",
    "approve_timesheet": "timesheets",
    "raise_correction": "tasks",

    # 👤 Employee (Self-Service)
    "mark_attendance": "attendance",
    "clock_in": "attendance",
    "clock_out": "attendance",
    "apply_leave": "leaves",
    "view_my_tasks": "tasks",
    "update_task_status": "tasks",
    "submit_timesheet": "timesheets",
    "upload_document": "profiles", # Simulated
    "raise_support_ticket": "profiles", # Simulated
    
    # Common
    "view_payslips": "payroll",
    "get_payroll": "payroll",
    "get_balance": "profiles",
    "get_tasks": "tasks",
    "view_my_tasks": "tasks",
    "view_team_tasks": "tasks",
    "view_active_tasks": "tasks",
    "view_all_active_tasks": "tasks",
    "get_all_tasks": "tasks",
    "get_employees": "profiles",
    "view_employees": "profiles",
    "get_all_employees": "profiles",
    "view_all_employees": "profiles",
    "get_pending_leaves": "leaves",
    "view_pending_leaves": "leaves",
    "get_all_leaves": "leaves",
    "view_all_leaves": "leaves",
    "view_team_leaves": "leaves",
    "view_dept_leaves": "leaves",
    "get_team_attendance": "attendance",
    "view_team_attendance": "attendance",
    "get_attendance": "attendance",
    "view_team_timesheets": "timesheets",
    "view_my_timesheets": "timesheets",
    "chat": "profiles",
    "greeting": "profiles",
    "view_my_timesheets": "timesheets",
    "schedule_meeting": "announcements",
    "request_task_validation": "tasks",
    "approve_task": "tasks",
    "reject_task": "tasks",
    "get_validation_queue": "tasks",
    "get_task_history": "task_state_history",
}

# ==========================================
# 4. VALIDATION & PERMISSIONS RULES
# ==========================================
REQUIRED_FIELDS = {
    "apply_leave": ["from_date", "to_date"], # removed reason
    "create_task": ["title", "assigned_to"], # removed priority, due_date (will use defaults)
    "submit_timesheet": ["hours"], # renamed from hours_worked, removed description
    "create_department": ["department_name"], 
    "create_team": ["team_name"], # manager_id will default to self
    "add_employee": ["full_name", "email"],
    "post_announcement": ["message"], # title will default
    "schedule_meeting": ["title", "date", "time", "attendees"],
    "upload_payslip": ["employee_id", "month", "net_salary"],
}

ROLE_PERMISSIONS = {
    "employee": ["mark_attendance", "clock_in", "clock_out", "apply_leave", "view_my_tasks", "update_task_status", "submit_timesheet", "upload_document", "view_payslips", "get_payroll", "raise_support_ticket", "get_tasks", "view_tasks", "show_tasks", "get_balance", "chat", "greeting", "view_my_timesheets", "request_task_validation", "get_task_history"],
    "team_lead": ["mark_attendance", "clock_in", "clock_out", "apply_leave", "view_my_tasks", "update_task_status", "submit_timesheet", "view_payslips", "get_payroll", "get_tasks", "view_tasks", "show_tasks", "get_balance", "chat", "greeting", "view_my_timesheets",
                 "view_team_attendance", "get_team_attendance", "get_attendance", "view_team_tasks", "view_team_leaves", "view_team_timesheets", "give_performance_feedback", "approve_timesheet", "raise_correction", "schedule_meeting", "request_task_validation", "get_task_history"],
    "manager": ["mark_attendance", "clock_in", "clock_out", "apply_leave", "view_my_tasks", "update_task_status", "submit_timesheet", "view_payslips", "get_payroll", "get_tasks", "view_tasks", "show_tasks", "get_balance", "chat", "greeting", "view_my_timesheets",
                "view_team_attendance", "get_team_attendance", "get_attendance", "view_team_tasks", "view_team_leaves", "view_team_timesheets", "view_dept_leaves", "get_pending_leaves", "view_pending_leaves",
                "add_dept_employee", "add_employee", "create_employee", "manager_approve_leave", "manager_reject_leave", "approve_leave", "reject_leave", "create_team", "assign_team_lead", "assign_task", "create_task", "view_dept_analytics", "schedule_meeting",
                "request_task_validation", "approve_task", "reject_task", "get_validation_queue", "get_task_history"],
    "executive": ["mark_attendance", "clock_in", "clock_out", "apply_leave", "view_my_tasks", "update_task_status", "submit_timesheet", "view_payslips", "get_payroll", "get_tasks", "view_tasks", "show_tasks", "get_active_tasks", "view_active_tasks", "view_all_active_tasks", "get_all_tasks", "get_balance", "chat", "greeting", "view_my_timesheets",
                  "view_team_attendance", "get_team_attendance", "get_attendance", "view_team_tasks", "view_team_leaves", "view_team_timesheets", "give_performance_feedback", "approve_timesheet", "raise_correction",
                  "get_employees", "view_employees", "get_all_employees", "view_all_employees", "get_pending_leaves", "view_pending_leaves", "get_all_leaves", "view_all_leaves",
                  "add_dept_employee", "add_employee", "create_employee", "manager_approve_leave", "manager_reject_leave", "approve_leave", "reject_leave", "create_team", "assign_team_lead", "assign_task", "create_task", "view_dept_analytics",
                  "create_department", "assign_manager", "approve_any_leave", "reject_any_leave", "upload_payslip", "post_announcement", "configure_policy", "assign_role", "access_ai_insights", "view_all_data", "view_all_active_tasks", "schedule_meeting",
                  "request_task_validation", "approve_task", "reject_task", "get_validation_queue", "get_task_history"]
}

# ==========================================
# 5. LOGIC ENGINE (The Brain)
# ==========================================
def is_valid_uuid(val):
    return bool(re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', str(val), re.I))

def clean_ai_json(text):
    # 1. Try to extract content between first { and last }
    match = re.search(r'(\{.*\})', text, re.DOTALL)
    if match:
        text = match.group(1)
    
    # 2. Basic cleanup for common LLM errors
    text = text.replace("'", '"') # Risky but often fixes unquoted keys/single quotes
    text = re.sub(r'```json\s*', '', text) 
    text = re.sub(r'```', '', text)
    
    # 3. Handle unescaped internal quotes (common AI mistake)
    # If the AI says {"title": "The "Big" Task"}, it breaks. 
    # This is a complex problem to solve with regex but we can try to fix simple cases.
    return text.strip()

def resolve_name_to_id(name):
    if not name or is_valid_uuid(name): return name
    try:
        # Search in profiles by full_name (IlIKE for partial/case-insensitive match)
        res = supabase.table("profiles").select("id").ilike("full_name", f"%{name}%").limit(1).execute()
        if res.data: return res.data[0]['id']
    except Exception as e: 
        print(f"Resolve Error: {e}")
    return None

def normalize_data(raw_data):
    action = raw_data.get("action")
    params = raw_data.get("data") or raw_data.get("parameters") or raw_data
    
    # Map AI's guess to real DB columns
    key_map = {
        "assignee": "assigned_to", 
        "manager": "manager_id", 
        "candidate": "name",
        "leave_type": "reason",
        "working_on": "current_task",
        "task_name": "title",
        "task_title": "title",
        "project_name": "name",
        "employee_name": "full_name",
        "name": "full_name",
        "employee_role": "role",
        "employee_email": "email",
        "start_date": "from_date",
        "end_date": "to_date",
        "begin_date": "from_date",
        "finish_date": "to_date",
        "name": "department_name", # For departments
        "dept_name": "department_name",
        "hours_worked": "hours", # For timesheets
        "work_hours": "hours"
    }
    clean_params = {}
    for k, v in params.items():
        if isinstance(k, str):
            clean_params[key_map.get(k.lower(), k)] = v
        else:
            clean_params[k] = v
        
    # If it's a single date, make both from/to the same
    if "from_date" in clean_params and "to_date" not in clean_params:
        clean_params["to_date"] = clean_params["from_date"]
        
    return action, clean_params

def sanitize_for_db(params, table_name, logged_in_user_id):
    cleaned = {}
    allowed_cols = TABLE_SCHEMAS.get(table_name, [])

    # 1. Resolve Names to IDs (e.g. "Assign to Akbar" -> UUID)
    # [CRITICAL] Skip this for the actual table we are inserting into (avoid chicken-egg)
    for field in ["assigned_to", "employee_id", "manager_id", "owner_id", "interviewer_id", "candidate_id"]:
        if field in params and table_name not in ["profiles", "candidates"]:
            val = params[field]
            if val is not None and isinstance(val, str) and "@" in val: # Try to resolve by email first
                try:
                    p_res = supabase.table("profiles").select("id").eq("email", val).limit(1).execute()
                    if p_res and p_res.data: params[field] = p_res.data[0]["id"]
                except: pass
            elif val is not None and isinstance(val, str) and not is_valid_uuid(val): # Then by name
                try:
                    p_res = supabase.table("profiles").select("id").ilike("full_name", f"%{val}%").limit(1).execute()
                    if p_res and p_res.data: params[field] = p_res.data[0]["id"]
                except: pass
            
            # If it's still not a UUID, try to resolve again with the updated value
            real_id = resolve_name_to_id(params[field])
            if real_id: params[field] = real_id

    # 2. Filter allowed columns & Remove empty strings
    for k, v in params.items():
        if k in allowed_cols and v not in ["", None]:
            cleaned[k] = v

    # 3. Handle specific table variations
    if table_name == "leaves":
        # Ensure 'from_date' and 'to_date' are set even if AI used 'start_date' etc.
        f_date = params.get("from_date") or params.get("start_date") or params.get("date")
        t_date = params.get("to_date") or params.get("end_date") or f_date
        if f_date: cleaned["from_date"] = f_date
        if t_date: cleaned["to_date"] = t_date

    if table_name == "tasks":
        # Ensure 'start_date' and 'due_date' are set
        s_date = params.get("start_date") or params.get("from_date") or params.get("date")
        d_date = params.get("due_date") or params.get("to_date") or params.get("end_date") or s_date
        if s_date: cleaned["start_date"] = s_date
        if d_date: cleaned["due_date"] = d_date
        
        # Ensure description is not null
        if "description" not in cleaned or not cleaned["description"]:
            cleaned["description"] = "Priority assignment via AI Control Center"

    if table_name == "announcements":
        # Ensure title, event_date and event_time are set
        if "title" not in cleaned or not cleaned["title"]:
            cleaned["title"] = params.get("message", "Announcement")[:50]
        
        # Default date/time for calendar visibility
        if "event_date" not in cleaned:
            # Try to extract from message if not already parsed
            msg = params.get("message", "")
            dates = re.findall(r"(\d{4}-\d{2}-\d{2})", msg)
            if dates:
                cleaned["event_date"] = dates[0]
            else:
                cleaned["event_date"] = datetime.now(IST).strftime("%Y-%m-%d")
        
        if "event_time" not in cleaned:
            cleaned["event_time"] = "09:00:00"
            
        if "event_for" not in cleaned:
            cleaned["event_for"] = "all"
        
        # Ensure teams and employees are at least empty lists if present in schema
        if "teams" in allowed_cols and "teams" not in cleaned:
            cleaned["teams"] = []
        if "employees" in allowed_cols and "employees" not in cleaned:
            cleaned["employees"] = []

    return cleaned

def detect_hard_action(user_text, user_role, logged_in_user_id):
    lower_text = user_text.lower()
    action = None
    params = {}
    
    # Standardize Role
    user_role = user_role.lower().strip() if user_role else "employee"
    if user_role in ["executor", "executive"]: user_role = "executive"
    if user_role in ["team_lead", "teamlead"]: user_role = "team_lead"

    if "task" in lower_text and ("assign" in lower_text or "create" in lower_text):
        action = "create_task"
        title_match = re.search(r"['\"](.*?)['\"]", user_text)
        if title_match: params["title"] = title_match.group(1)
        else:
            match = re.search(r"(?:task|title)\s+['\"]?(.*?)['\"]?\s+to", lower_text)
            if match: params["title"] = match.group(1).strip().title()
        
        for name in ["Pavan", "Vardhan", "John", "Akbar", "Sudheer", "Mohith"]:
            if f"to {name.lower()}" in lower_text or f"assign {name.lower()}" in lower_text:
                params["assigned_to"] = name
        
        dates = re.findall(r"(\d{4}-\d{2}-\d{2})", user_text)
        if dates:
            params["start_date"] = dates[0]
            params["due_date"] = dates[1] if len(dates) > 1 else dates[0]
        
        if "high" in lower_text: params["priority"] = "high"
        elif "medium" in lower_text: params["priority"] = "medium"
        elif "low" in lower_text: params["priority"] = "low"
    
    # Removed hardcoded view tasks to favor AI SQL
    
    # Removed hardcoded attendance view to favor AI SQL

    elif "payroll" in lower_text or "payslip" in lower_text:
        action = "get_payroll"
        if "december" in lower_text: params["month"] = "December"
        elif "january" in lower_text: params["month"] = "January"

    elif "check" in lower_text and "in" in lower_text:
        action = "clock_in"
    elif "clock" in lower_text and "in" in lower_text:
        action = "clock_in"
    elif "clock" in lower_text and "out" in lower_text:
        action = "clock_out"
    elif "check" in lower_text and "out" in lower_text:
        action = "clock_out"
    elif "balance" in lower_text:
        action = "get_balance"

    elif "leave" in lower_text and "apply" in lower_text:
        action = "apply_leave"
        dates = re.findall(r"(\d{4}-\d{2}-\d{2})", user_text)
        if dates:
            params["from_date"] = dates[0]
            params["to_date"] = dates[1] if len(dates) > 1 else dates[0]
        for r in ["vacation", "sick", "marriage", "emergency", "personal", "travel"]:
            if r in lower_text: params["reason"] = r.capitalize()
    
    elif "leave" in lower_text and ("approve" in lower_text or "reject" in lower_text):
        if user_role == "executive":
            action = "approve_any_leave" if "approve" in lower_text else "reject_any_leave"
        elif user_role == "manager":
            action = "manager_approve_leave" if "approve" in lower_text else "manager_reject_leave"
        else:
            action = "approve_leave" if "approve" in lower_text else "reject_leave"
        
        # Robust Name Extraction
        name_patterns = [
            r"(?:approve|reject)\s+(?:the\s+)?leave\s+for\s+([a-zA-Z0-9]+)",
            r"(?:approve|reject)\s+([a-zA-Z0-9]+)'s\s+leave",
            r"(?:approve|reject)\s+([a-zA-Z0-9]+)"
        ]
        for pat in name_patterns:
            m = re.search(pat, lower_text)
            if m:
                extracted = m.group(1)
                if extracted not in ["the", "leave"]: # filter out common accidental matches
                    params["employee_name"] = extracted.title()
                    break
    
    elif "leave" in lower_text and "pending" in lower_text:
        action = "view_pending_leaves"
    
    elif "team" in lower_text and ("add" in lower_text or "create" in lower_text):
        action = "create_team"
        name_match = re.search(r"['\"](.*?)['\"]", user_text)
        if not name_match:
            name_match = re.search(r"(?:create|add)\s+(?:a\s+new\s+)?([a-zA-Z\s\-]+?)\s+team", lower_text)
        if name_match:
            params["team_name"] = name_match.group(1).split("'")[0].split('"')[0].strip().title()

    elif "announcement" in lower_text or "post" in lower_text:
        action = "post_announcement"
        # Extraction logic for message/title
        msg = user_text
        if ":" in user_text:
            msg = user_text.split(":", 1)[1].strip()
        elif "announcement" in lower_text:
            msg = user_text.split("announcement", 1)[1].strip().strip(":")
        
        params["message"] = msg
        params["title"] = msg[:50] # Use first 50 chars as title
        
        # Basic date extraction for announcements
        dates = re.findall(r"(\d{4}-\d{2}-\d{2})", user_text)
        if dates:
            params["event_date"] = dates[0]
        else:
            # Look for month names/days if not YYYY-MM-DD
            months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
            for i, m in enumerate(months):
                if m in lower_text:
                    # Very basic: look for digits near month name
                    day_match = re.search(fr"{m}\w*\s*(\d+)", lower_text)
                    if day_match:
                        day = day_match.group(1)
                        year = datetime.now(IST).year
                        params["event_date"] = f"{year}-{i+1:02d}-{int(day):02d}"
                        break
    
    elif "meeting" in lower_text and ("schedule" in lower_text or "book" in lower_text or "set" in lower_text or "arrange" in lower_text or "with" in lower_text):
        action = "schedule_meeting"
        
        # Extract title from quotes or after "for"/"about"/"titled"
        title_match = re.search(r"(?:for|about|titled)\s+['\"]?([^'\"]+?)['\"]?(?:\s+(?:with|on|at|tomorrow|today)|$)", lower_text)
        if title_match:
            params["title"] = title_match.group(1).strip().title()
        else:
            # Default title
            params["title"] = "Team Meeting"
        
        # Extract attendees - look for "with [names]"
        with_match = re.search(r"with\s+([a-zA-Z,\s]+?)(?:\s+(?:on|at|tomorrow|today|for|about)|$)", lower_text)
        if with_match:
            params["attendees"] = with_match.group(1).strip()
        
        # Extract date
        if "tomorrow" in lower_text:
            params["date"] = "tomorrow"
        elif "today" in lower_text:
            params["date"] = "today"
        elif "next week" in lower_text:
            params["date"] = "next week"
        else:
            # Look for YYYY-MM-DD format
            date_match = re.search(r"(\d{4}-\d{2}-\d{2})", user_text)
            if date_match:
                params["date"] = date_match.group(1)
        
        # Extract time
        time_match = re.search(r"(?:at\s+)?(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm|AM|PM)?", lower_text)
        if time_match:
            hour = time_match.group(1)
            minutes = time_match.group(2) or "00"
            meridiem = time_match.group(3) or ""
            params["time"] = f"{hour}:{minutes}{meridiem}".strip()

    elif "department" in lower_text and ("add" in lower_text or "create" in lower_text):
        action = "create_department"
        name_match = re.search(r"['\"](.*?)['\"]", user_text)
        if not name_match: 
            name_match = re.search(r"(?:create|add)\s+(?:a\s+new\s+)?([a-zA-Z\s\-]+?)\s+department", lower_text)
        if name_match: 
            params["department_name"] = name_match.group(1).split("'")[0].split('"')[0].strip().title()

    elif "employee" in lower_text and ("add" in lower_text or "create" in lower_text):
        action = "add_employee"
        name_match = re.search(r"(?:add|create)\s+employee\s+([a-zA-Z]+)", lower_text)
        if name_match: params["full_name"] = name_match.group(1).title()
        if "role" in lower_text:
            r_match = re.search(r"role\s+([a-zA-Z]+)", lower_text)
            if r_match: params["role"] = r_match.group(1)
        if "@" in lower_text:
            e_match = re.search(r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", lower_text)
            if e_match: params["email"] = e_match.group(1)

    return action, params

def process_request(json_str, user_text, logged_in_user_id, user_role=None, team_id=None):
    try:
        # Normalize role: lower, strip
        user_role = user_role.lower().strip() if user_role else "employee"
        if user_role in ["executor", "executive"]: user_role = "executive"
        if user_role in ["team_lead", "teamlead"]: user_role = "team_lead"
        
        # [CRITICAL BEHAVIORAL REDIRECT] Team Leads cannot approve leaves
        is_leave_attempt = any(kw in user_text.lower() for kw in ["leave", "approve", "reject"]) and "timesheet" not in user_text.lower() and "attendance" not in user_text.lower()
        if user_role == "team_lead" and is_leave_attempt:
            return f"**Role: Team Lead**\n\nI cannot approve or reject leave requests. As a Team Lead, you manage team attendance and timesheets, but leave approval requires Manager or Executive access. This request has been redirected to the appropriate authority."

        lower_text = user_text.lower()
        
        # --- PHASE 0: Manual Recognition ---
        action, params = detect_hard_action(user_text, user_role, logged_in_user_id)
        
        # If manual recognition failed, use AI JSON
        if not action:
            clean_json_str = clean_ai_json(json_str)
            try: 
                data = json.loads(clean_json_str)
                action, params = normalize_data(data)
            except Exception as je: 
                print(f"JSON Parse Error: {je} | Raw Content: {json_str}")
                return "I understood your request but I need you to be more specific. What exactly would you like to do?"
        # --- END PHASE 0 ---

        # 0. Basic Abort logic
        if any(w in user_text.lower() for w in ["cancel", "nevermind", "stop", "forget it"]):
            return "Ok, I've cancelled that action. What else can I help you with?"

        # Phase 1: Context-Aware Field Aliasing (Handle synonyms before validation)
        if action == "create_task":
            # If user said 'date' or 'to_date' or 'deadline', map it to 'due_date'
            for synonym in ["date", "to_date", "deadline", "end_date"]:
                if synonym in params and "due_date" not in params:
                    params["due_date"] = params[synonym]
            # Rename 'on_date' or 'by_date' if the AI got creative
            for k in list(params.keys()):
                if "date" in k and "due_date" not in params:
                    params["due_date"] = params[k]

        # 1. Permission Check (RBAC) + Behavioral Redirection
        allowed_actions = ROLE_PERMISSIONS.get(user_role, [])
        
        # [BEHAVIORAL REDIRECT] Team Leads cannot approve leaves
        is_leave_modification = any(kw in user_text.lower() for kw in ["approve", "reject"]) and "leave" in user_text.lower()
        if user_role == "team_lead" and is_leave_modification:
             return f"**Role: Team Lead**\n\nI cannot approve or reject leave requests. As a Team Lead, you manage team attendance and timesheets, but leave approval requires Manager or Executive access. This request has been redirected to the appropriate authority."

        role_display = user_role.replace("_", " ").title()
        
        if action not in allowed_actions:
            return f"**Role: {role_display}**\n\nI'm sorry, you are not authorized to perform the '{action.replace('_', ' ') if action else 'unknown'}' action. This action is reserved for higher authorities in TalentOps."

        if action not in ACTION_MAPPING:
            return f"**Role: {role_display}**\n\nThis action is not supported yet."

        table = ACTION_MAPPING[action]

        # 2. Validation Check (Missing Fields) - EASY MODE
        # We fill defaults here to avoid asking the user complex questions.
        if action == "apply_leave" and not params.get("reason"): params["reason"] = "General Leave Request"
        if action == "create_task":
            if not params.get("priority"): params["priority"] = "Medium"
            if not params.get("due_date"): params["due_date"] = datetime.now().strftime("%Y-%m-%d")
        if action == "submit_timesheet":
            if not params.get("hours"): params["hours"] = 8
            if not params.get("description"): params["description"] = "Daily work hours"

        required = REQUIRED_FIELDS.get(action, [])
        missing = [f for f in required if f not in params or not params[f]]
        
        # Mapping DB names to user-friendly names for the question
        friendly_names = {"full_name": "full name", "from_date": "start date", "to_date": "end date", "due_date": "due date", "reason": "reason", "title": "title", "assigned_to": "assignee", "priority": "priority", "current_task": "current task", "amount": "amount", "message": "message", "category": "category", "department_name": "department name", "hours": "hours"}
        if missing:
            m_text = " and ".join([friendly_names.get(m, m) for m in missing])
            return f"I'm ready to help with that, but I just need the **{m_text}**. Please let me know the details to proceed!"
        
        # --- SCENARIO A: UPDATES (Approvals, Rejections, Completion, Clock-out) ---
        update_actions = ["approve_leave", "reject_leave", "manager_approve_leave", "manager_reject_leave", "approve_any_leave", "reject_any_leave", "update_task", "mark_completed", "checkout", "clock_out", "update_task_status"]
        if action in update_actions:
            target_id = params.get("id") or params.get("leave_id") or params.get("task_id")
            
            # 1. Special Case: Checkout (Attendance)
            if action in ["checkout", "clock_out"]:
                today_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                res = supabase.table(table).select("*").eq("employee_id", logged_in_user_id).eq("date", today_utc).is_("clock_out", "null").execute()
                if not res.data:
                    res = supabase.table(table).select("*").eq("employee_id", logged_in_user_id).eq("date", today_utc).eq("clock_out", "").execute()

                if res.data:
                    record = res.data[0]
                    tid, clock_in_str = record['id'], record.get('clock_in')
                    now_str = datetime.now(IST).strftime("%H:%M:%S")
                    total_hours = 0
                    if clock_in_str:
                        try:
                            start, end = datetime.strptime(clock_in_str, "%H:%M:%S"), datetime.strptime(now_str, "%H:%M:%S")
                            total_hours = round((end - start).total_seconds() / 3600, 2)
                        except: pass
                    supabase.table(table).update({"clock_out": now_str, "total_hours": total_hours}).eq("id", tid).execute()
                    return f"Checked out successfully at {now_str} IST. Total hours: {total_hours}."
                return f"I couldn't find an active check-in for today ({today_utc}) to clock out."

            # 2. Smart Lookup (If no ID provided)
            if not target_id:
                target_person = params.get("employee_name") or params.get("full_name") or params.get("assigned_to")
                resolved_id = resolve_name_to_id(target_person) or (logged_in_user_id if "task" in action else None)
                
                if resolved_id:
                    query = supabase.table(table).select("id", "title" if table=="tasks" else "reason").eq("employee_id" if table != "tasks" else "assigned_to", resolved_id)
                    if table != "tasks": query = query.eq("status", "pending")
                    else: query = query.neq("status", "completed")
                    
                    res = query.execute()
                    if len(res.data) > 1:
                        # Find the best match or show options
                        options = "\n".join([f"- {r.get('title') or r.get('reason')} (ID: {r['id']})" for r in res.data])
                        return f"I found {len(res.data)} pending items for **{target_person}**. Which one should I update?\n{options}"
                    elif res.data: 
                        target_id = res.data[0]['id']

            # 3. Execution
            if target_id:
                new_status = "approved" if "approve" in action else ("completed" if "complete" in action else "rejected")
                # Handle task status mapping (e.g., 'completed' instead of 'approved')
                if table == "tasks" and new_status == "approved": new_status = "completed"
                
                res = supabase.table(table).update({"status": new_status}).eq("id", target_id).execute()
                status_display = new_status.capitalize()
                return f"Success! I've marked the {table.rstrip('s')} request as **{status_display}**."
            
            return "I understood your request but I couldn't find a pending record to update. Please provide a specific ID or name."

        # --- SCENARIO A.5: SCHEDULE MEETING ---
        if action == "schedule_meeting":
            role_display = user_role.replace("_", " ").title()
            
            # Permission check (redundant but safe)
            if user_role == "employee":
                return f"**Role: {role_display}**\n\n❌ As an Employee, you cannot schedule meetings. Please contact your manager."
            
            title = params.get("title", "")
            meeting_date = params.get("date", "")
            meeting_time = params.get("time", "")
            attendees = params.get("attendees", "")
            
            # Convert relative dates to actual dates
            if meeting_date:
                meeting_date_lower = meeting_date.lower()
                if 'tomorrow' in meeting_date_lower:
                    meeting_date = (datetime.now(IST) + timedelta(days=1)).strftime("%Y-%m-%d")
                elif 'today' in meeting_date_lower:
                    meeting_date = datetime.now(IST).strftime("%Y-%m-%d")
                elif 'next week' in meeting_date_lower:
                    meeting_date = (datetime.now(IST) + timedelta(days=7)).strftime("%Y-%m-%d")
            
            # Check missing fields
            missing_fields = []
            if not title: missing_fields.append("title")
            if not meeting_date: missing_fields.append("date")
            if not meeting_time: missing_fields.append("time")
            if not attendees: missing_fields.append("attendees")
            
            if missing_fields:
                return f"**Role: {role_display}**\n\nTo schedule this meeting, I need: **{', '.join(missing_fields)}**. Please provide these details."
            
            # Find attendees in profiles
            attendee_names = [name.strip() for name in attendees.split(',')]
            attendee_full_names = []
            
            for name in attendee_names:
                try:
                    find_res = supabase.table("profiles").select("id", "full_name").ilike("full_name", f"%{name}%").limit(1).execute()
                    if find_res.data and len(find_res.data) > 0:
                        attendee_full_names.append(find_res.data[0]['full_name'])
                except Exception as e:
                    print(f"Error finding attendee '{name}': {e}")
            
            if not attendee_full_names:
                return f"**Role: {role_display}**\n\n❌ I couldn't find any employees matching: **{attendees}**. Please check the names."
            
            # Convert time format (3pm -> 15:00)
            formatted_time = meeting_time
            if 'am' in meeting_time.lower() or 'pm' in meeting_time.lower():
                try:
                    # Handle formats like "3pm", "3 pm", "10am"
                    time_str = meeting_time.lower().replace(' ', '')
                    if 'pm' in time_str:
                        hour = int(re.search(r'(\d+)', time_str).group(1))
                        if hour != 12:
                            hour += 12
                        formatted_time = f"{hour:02d}:00"
                    elif 'am' in time_str:
                        hour = int(re.search(r'(\d+)', time_str).group(1))
                        if hour == 12:
                            hour = 0
                        formatted_time = f"{hour:02d}:00"
                except:
                    formatted_time = meeting_time.replace('am', ':00').replace('pm', ':00')
            
            # Determine initial status based on date
            today_str = datetime.now(IST).strftime("%Y-%m-%d")
            if meeting_date == today_str:
                initial_status = "active"
            elif meeting_date < today_str:
                initial_status = "completed"
            else:
                initial_status = "future"
            
            # Create announcement for the meeting
            employees_str = ', '.join(attendee_full_names)
            announcement_data = {
                "title": title,
                "message": f"Meeting scheduled with {employees_str}",
                "event_for": "Employee Event",
                "employees": attendee_full_names,
                "event_date": meeting_date,
                "event_time": formatted_time,
                "status": initial_status
            }
            
            print(f"[MEETING] Creating announcement: {announcement_data}")
            
            try:
                res = supabase.table("announcements").insert(announcement_data).execute()
                
                if res.data:
                    return f"**Role: {role_display}**\n\n✅ **Meeting Scheduled!**\n\n📌 **{title}**\n📅 Date: {meeting_date}\n⏰ Time: {formatted_time}\n👥 Attendees: {employees_str}"
                else:
                    return f"**Role: {role_display}**\n\n❌ Failed to schedule meeting. Please try again."
            except Exception as e:
                print(f"[MEETING ERROR] {e}")
                return f"**Role: {role_display}**\n\n❌ Failed to schedule meeting. Error: {str(e)}"

        # --- SCENARIO A.6: TASK LIFECYCLE ACTIONS ---
        
        # Request Task Validation (All roles can request for their own tasks)
        if action == "request_task_validation":
            role_display = user_role.replace("_", " ").title()
            task_title = params.get("task_title", "")
            
            if not task_title:
                return f"**Role: {role_display}**\n\nPlease specify which task you want to request validation for."
            
            # Find the task by title
            try:
                task_res = supabase.table("tasks").select("id", "title", "assigned_to", "lifecycle_state", "sub_state").ilike("title", f"%{task_title}%").limit(1).execute()
                
                if not task_res.data:
                    return f"**Role: {role_display}**\n\n❌ Could not find a task matching '{task_title}'."
                
                task = task_res.data[0]
                task_id = task['id']
                
                # Call the RPC function
                result = supabase.rpc("request_task_validation", {"p_task_id": task_id, "p_user_id": logged_in_user_id}).execute()
                
                if result.data and result.data.get('success'):
                    return f"**Role: {role_display}**\n\n✅ **Validation Requested!**\n\n📌 Task: **{task['title']}**\n📊 Current State: {task.get('lifecycle_state', 'requirement_refiner')}\n➡️ Requesting: {result.data.get('requested_next_state', 'next phase')}\n\n⏳ Awaiting manager approval."
                else:
                    return f"**Role: {role_display}**\n\n❌ {result.data.get('message', 'Failed to request validation')}"
            except Exception as e:
                print(f"[VALIDATION REQUEST ERROR] {e}")
                return f"**Role: {role_display}**\n\n❌ Error requesting validation: {str(e)}"
        
        # Approve Task (Manager/Executive only)
        if action == "approve_task":
            role_display = user_role.replace("_", " ").title()
            
            if user_role not in ["manager", "executive"]:
                return f"**Role: {role_display}**\n\n❌ Only Managers and Executives can approve tasks."
            
            task_title = params.get("task_title", "")
            comment = params.get("comment", "")
            
            if not task_title:
                return f"**Role: {role_display}**\n\nPlease specify which task you want to approve."
            
            try:
                # Find the task
                task_res = supabase.table("tasks").select("id", "title", "assigned_to", "lifecycle_state").ilike("title", f"%{task_title}%").eq("sub_state", "pending_validation").limit(1).execute()
                
                if not task_res.data:
                    return f"**Role: {role_display}**\n\n❌ Could not find a pending task matching '{task_title}'."
                
                task = task_res.data[0]
                task_id = task['id']
                
                # Call the RPC function
                result = supabase.rpc("approve_task", {"p_task_id": task_id, "p_manager_id": logged_in_user_id, "p_comment": comment or None}).execute()
                
                if result.data and result.data.get('success'):
                    return f"**Role: {role_display}**\n\n✅ **Task Approved!**\n\n📌 Task: **{task['title']}**\n➡️ Advanced to: **{result.data.get('new_lifecycle_state', 'next phase')}**"
                else:
                    return f"**Role: {role_display}**\n\n❌ {result.data.get('message', 'Failed to approve task')}"
            except Exception as e:
                print(f"[APPROVE TASK ERROR] {e}")
                return f"**Role: {role_display}**\n\n❌ Error approving task: {str(e)}"
        
        # Reject Task (Manager/Executive only)
        if action == "reject_task":
            role_display = user_role.replace("_", " ").title()
            
            if user_role not in ["manager", "executive"]:
                return f"**Role: {role_display}**\n\n❌ Only Managers and Executives can reject tasks."
            
            task_title = params.get("task_title", "")
            reason = params.get("reason", "")
            
            if not task_title:
                return f"**Role: {role_display}**\n\nPlease specify which task you want to reject."
            
            if not reason:
                return f"**Role: {role_display}**\n\n⚠️ A rejection reason is required. Please provide feedback for the task owner."
            
            try:
                # Find the task
                task_res = supabase.table("tasks").select("id", "title", "assigned_to", "lifecycle_state").ilike("title", f"%{task_title}%").eq("sub_state", "pending_validation").limit(1).execute()
                
                if not task_res.data:
                    return f"**Role: {role_display}**\n\n❌ Could not find a pending task matching '{task_title}'."
                
                task = task_res.data[0]
                task_id = task['id']
                
                # Call the RPC function
                result = supabase.rpc("reject_task", {"p_task_id": task_id, "p_manager_id": logged_in_user_id, "p_reason": reason}).execute()
                
                if result.data and result.data.get('success'):
                    return f"**Role: {role_display}**\n\n❌ **Task Rejected**\n\n📌 Task: **{task['title']}**\n📝 Feedback: {reason}\n\nTask has been sent back for revision."
                else:
                    return f"**Role: {role_display}**\n\n❌ {result.data.get('message', 'Failed to reject task')}"
            except Exception as e:
                print(f"[REJECT TASK ERROR] {e}")
                return f"**Role: {role_display}**\n\n❌ Error rejecting task: {str(e)}"
        
        # Get Validation Queue (Manager/Executive only)
        if action == "get_validation_queue":
            role_display = user_role.replace("_", " ").title()
            
            if user_role not in ["manager", "executive"]:
                return f"**Role: {role_display}**\n\n❌ Only Managers and Executives can view the validation queue."
            
            try:
                result = supabase.rpc("get_validation_queue", {"p_manager_id": logged_in_user_id}).execute()
                
                if not result.data or len(result.data) == 0:
                    return f"**Role: {role_display}**\n\n✅ No tasks pending your validation. All caught up!"
                
                # Format the queue
                lines = [f"**Role: {role_display}**\n\n📋 **Tasks Pending Your Validation** ({len(result.data)} total)\n"]
                for i, task in enumerate(result.data, 1):
                    lines.append(f"{i}. **{task['title']}**")
                    lines.append(f"   👤 Assigned to: {task.get('assigned_to_name', 'Unknown')}")
                    lines.append(f"   📊 Current: {task.get('lifecycle_state', 'N/A')} → Requesting: {task.get('requested_next_state', 'N/A')}")
                    lines.append(f"   🕐 Requested: {task.get('validation_requested_at', 'N/A')[:10] if task.get('validation_requested_at') else 'N/A'}")
                    lines.append("")
                
                return "\n".join(lines)
            except Exception as e:
                print(f"[VALIDATION QUEUE ERROR] {e}")
                return f"**Role: {role_display}**\n\n❌ Error fetching validation queue: {str(e)}"
        
        # Get Task History
        if action == "get_task_history":
            role_display = user_role.replace("_", " ").title()
            task_title = params.get("task_title", "")
            
            if not task_title:
                return f"**Role: {role_display}**\n\nPlease specify which task's history you want to view."
            
            try:
                # Find the task
                task_res = supabase.table("tasks").select("id", "title").ilike("title", f"%{task_title}%").limit(1).execute()
                
                if not task_res.data:
                    return f"**Role: {role_display}**\n\n❌ Could not find a task matching '{task_title}'."
                
                task = task_res.data[0]
                task_id = task['id']
                
                # Call the RPC function
                result = supabase.rpc("get_task_history", {"p_task_id": task_id}).execute()
                
                if not result.data or len(result.data) == 0:
                    return f"**Role: {role_display}**\n\n📋 **{task['title']}** - No state transitions recorded yet."
                
                # Format history
                lines = [f"**Role: {role_display}**\n\n📜 **History for: {task['title']}**\n"]
                for entry in result.data:
                    action_emoji = {"request_validation": "📤", "approve": "✅", "reject": "❌", "cancel_request": "🔙"}.get(entry.get('action', ''), "📌")
                    lines.append(f"{action_emoji} **{entry.get('action', 'N/A').replace('_', ' ').title()}**")
                    lines.append(f"   {entry.get('from_lifecycle_state', '')} → {entry.get('to_lifecycle_state', '')}")
                    lines.append(f"   👤 By: {entry.get('actor_name', 'Unknown')} ({entry.get('actor_role', '')})")
                    if entry.get('comment'):
                        lines.append(f"   💬 {entry['comment']}")
                    lines.append(f"   🕐 {entry.get('created_at', 'N/A')[:16] if entry.get('created_at') else 'N/A'}")
                    lines.append("")
                
                return "\n".join(lines)
            except Exception as e:
                print(f"[TASK HISTORY ERROR] {e}")
                return f"**Role: {role_display}**\n\n❌ Error fetching task history: {str(e)}"

        # --- SCENARIO B: READS (Fetching Data) ---
        read_actions = ["get_tasks", "view_tasks", "show_tasks", "get_active_tasks", "view_active_tasks", "get_all_tasks", "get_policies", "view_policies", "get_payroll", "view_payslips", "get_payslips", "get_pending_leaves", "view_pending_leaves", "get_all_leaves", "view_all_leaves", "get_employees", "view_employees", "get_all_employees", "view_all_employees", "get_team_attendance", "view_team_attendance", "get_attendance", "view_team_tasks", "view_team_leaves", "view_team_timesheets", "view_my_tasks", "view_all_active_tasks", "view_dept_leaves"]
        if action in read_actions:
            # Pre-fetch profiles for name/team/role resolution
            p_res = supabase.table("profiles").select("*").execute()
            name_map = {p['id']: p['full_name'] for p in p_res.data if p and p.get('id')}
            user_team_map = {p['id']: p.get('team_id') for p in p_res.data if p and p.get('id')}

            if "task" in action:
                query = supabase.table(table).select("*").neq("status", "completed")
                # Authority check: Show team/all or just self
                if "all" in action or "active" in action or user_role in ["executive", "manager"]:
                    pass # Show all for these roles/actions
                elif user_role == "team_lead" or "team" in action:
                    if team_id: query = query.eq("team_id", team_id)
                else:
                    query = query.eq("assigned_to", logged_in_user_id)
                
                res = query.order("id", desc=True).limit(10).execute()
                if not res.data: return "No active tasks found matching that criteria."
                items = []
                for t in res.data:
                    name = name_map.get(t.get('assigned_to'), "Unassigned")
                    items.append(f"- {t['title']} (Assignee: {name}) [Status: {t.get('status', 'pending')}]")
                return f"Found {len(res.data)} active tasks:\n" + "\n".join(items)
            
            elif "leave" in action:
                query = supabase.table(table).select("*")
                if "pending" in action: query = query.ilike("status", "pending")
                # Authority filtering
                if user_role == "employee":
                    query = query.eq("employee_id", logged_in_user_id)
                elif user_role == "team_lead" or "team" in action:
                    if team_id: query = query.eq("team_id", team_id)
                
                res = query.execute()
                if not res.data: return "No leave requests found for the selected view."
                items = []
                for r in res.data:
                    name = name_map.get(r.get("employee_id"), "Unknown")
                    items.append(f"- {name}: {r.get('reason')} ({r['status']}) [Date: {r.get('from_date')}]")
                return f"Leave Records:\n" + "\n".join(items)

            elif "attendance" in action:
                date_to_check = datetime.now(IST).strftime("%Y-%m-%d")
                query = supabase.table(table).select("*").eq("date", date_to_check)
                if user_role == "employee":
                    query = query.eq("employee_id", logged_in_user_id)
                elif user_role == "team_lead" or "team" in action:
                    if team_id: query = query.eq("team_id", team_id)
                
                res = query.execute()
                if not res.data: return f"No attendance records found for today ({date_to_check})."
                items = []
                for r in res.data:
                    name = name_map.get(r['employee_id'], "Unknown")
                    items.append(f"- {name}: In {r.get('clock_in')} | Out {r.get('clock_out', 'In Progress')}")
                return f"Attendance Report ({date_to_check}):\n" + "\n".join(items)

            elif "payroll" in action or "payslip" in action:
                month = params.get("month") or datetime.now().strftime("%B")
                query = supabase.table(table).select("*")
                if user_role == "employee":
                    query = query.eq("employee_id", logged_in_user_id)
                res = query.execute()
                if not res.data: return f"No payroll records found for {month}."
                items = []
                for p in res.data:
                    name = name_map.get(p.get("employee_id"), "Unknown")
                    items.append(f"- {name}: Net {p.get('net_salary', 0)} [Status: {p.get('status', 'Processed')}]")
                return f"Payroll Summary ({month}):\n" + "\n".join(items)

            elif "timesheet" in action:
                query = supabase.table(table).select("*")
                if user_role == "employee":
                    query = query.eq("employee_id", logged_in_user_id)
                res = query.order("date", desc=True).limit(10).execute()
                if not res.data: return "No timesheet entries found."
                items = []
                for t in res.data:
                    name = name_map.get(t.get("employee_id"), "Unknown")
                    items.append(f"- {name}: {t.get('hours')} hours on {t.get('date')}")
                return f"Recent Timesheets:\n" + "\n".join(items)

            elif "employee" in action:
                res = supabase.table(table).select("full_name", "role", "id").limit(10).execute()
                if not res.data: return "No employee profiles found."
                items = [f"- {e['full_name']} ({e['role'].title()})" for e in res.data]
                return "Directory:\n" + "\n".join(items)
            
            elif "polic" in action:
                res = supabase.table(table).select("*").eq("status", "Active").execute()
                if not res.data: return "No active policies found."
                items = [f"- {p['title']} [{p.get('category', 'General')}]" for p in res.data]
                return "Company Policies:\n" + "\n".join(items)
            
            elif "balance" in action:
                res = supabase.table("profiles").select("leaves_remaining", "leaves_taken_this_month").eq("id", logged_in_user_id).limit(1).execute()
                if res.data:
                    p = res.data[0]
                    return f"You currently have **{p.get('leaves_remaining', 0)}** leaves available. You have taken {p.get('leaves_taken_this_month', 0)} leaves this month."
                return "I couldn't retrieve your leave balance at this time."
            
            # Handle any other read actions that might have slipped through
            return "Action recognized but I'm still gathering the right data for that. Please try again in a moment."

        # --- SCENARIO C: INSERTS (Creating things) ---
        final_data = sanitize_for_db(params, table, logged_in_user_id)
        
        # Auto-fill technical essentials (User shouldn't have to specify these)
        cols = TABLE_SCHEMAS.get(table, [])
        if "employee_id" in cols and "employee_id" not in final_data:
            final_data["employee_id"] = logged_in_user_id
        if "assigned_by" in cols and "assigned_by" not in final_data:
            final_data["assigned_by"] = logged_in_user_id
        if "status" in cols and "status" not in final_data:
            final_data["status"] = "pending" if table in ["leaves", "expenses", "payroll"] else ("active" if table != "tasks" else "pending")
        
        # Profile Specific Fixes
        if table == "profiles":
            if "team_id" in cols and "team_id" not in final_data:
                # Assign to a default team (Janmasethu) if none specified to satisfy FK constraints
                final_data["team_id"] = "a33e30be-5272-466d-8e47-49779df34e62" 
            if "role" in final_data:
                # Ensure the role is one of the supported strings in the app
                valid_roles = ["employee", "manager", "team_lead", "executive"]
                if final_data["role"].lower() not in valid_roles:
                    final_data["role"] = "employee" # Fallback
            if "employee_id" in final_data: del final_data["employee_id"] # profiles doesn't use this, it's the ID itself

        # Date and Time auto-filling for all tables
        now = datetime.now()
        if "date" in cols and not final_data.get("date"):
            final_data["date"] = now.strftime("%Y-%m-%d")
        
        if table == "attendance":
            if not final_data.get("clock_in"): final_data["clock_in"] = datetime.now(IST).strftime("%H:%M:%S")

        # Priority and Dates for tasks
        if table == "tasks":
            if not final_data.get("priority"): final_data["priority"] = "medium"
            if not final_data.get("status"): final_data["status"] = "pending"
            if not final_data.get("start_date"): final_data["start_date"] = now.strftime("%Y-%m-%d")
            if not final_data.get("due_date"): final_data["due_date"] = final_data["start_date"]

        # Default 'pending' status for others
        if "status" in cols and not final_data.get("status"):
            final_data["status"] = "pending"

        # Final ID resolution for Foreign Keys (Auto-fill identifiers to make it easy)
        id_keys = ["assigned_by", "manager_id", "employee_id", "owner_id", "generated_by", "created_by"]
        for key in id_keys:
            if key in cols and not final_data.get(key):
                final_data[key] = logged_in_user_id

        # Team ID resolution
        if "team_id" in cols and not final_data.get("team_id"):
            try:
                p_res = supabase.table("profiles").select("team_id").eq("id", logged_in_user_id).limit(1).execute()
                if p_res.data: final_data["team_id"] = p_res.data[0].get("team_id")
            except: pass

        # CRITICAL FALLBACK: If assigned_to is still missing or invalid, assign to self
        if action == "create_task" and ("assigned_to" not in final_data or not final_data["assigned_to"]):
            final_data["assigned_to"] = logged_in_user_id
            print(f"Assigning task to self (fallback).")

        print(f"DEBUG INSERT into {table}: {final_data}") 
        try:
            res = supabase.table(table).insert(final_data).execute()
        except Exception as insert_error:
            print(f"DB INSERT ERROR: {insert_error}")
            # Log the error to a file for investigation
            with open("db_error.log", "a") as f: f.write(f"\n{datetime.now()}: {table} INSERT ERROR: {insert_error}\nData: {final_data}\n")
            return f"I couldn't process that {action.replace('_', ' ')} due to a database error: {str(insert_error)}"
        
        if not res.data:
             return f"I confirmed your request for {action.replace('_', ' ')}, but the database didn't save it. Please try again or refresh the page."
             
        return f"Done! I've successfully added that to your {table} list."

    except Exception as e:
        return f"System Error: {str(e)}"

# ==========================================
# 5. SERVER ENDPOINT
# ==========================================
class ChatRequest(BaseModel):
    message: str
    role: str
    user_id: str
    team_id: str = None
    # Project context for multi-project role-based permissions
    project_id: str = None
    project_role: str = None

SYSTEM_PROMPT = """SYSTEM PROMPT — TALENTOPS ROLE-BASED CHATBOT BEHAVIOR

You are TalentOps AI Assistant, operating inside a production HRM system.

You must never guess, invent, or bypass rules.
You operate only within defined roles, permissions, and workflows.

Your job is to guide users, validate actions, and return structured responses based on their role.

System context is derived from the official TalentOps workflow and architecture documents

🧭 CORE PRINCIPLES (MANDATORY)
1. Role-first behavior
Every response MUST start by identifying the user role: **Role: [Role Name]**
2. Permission enforcement
3. No hallucinations
4. Structured outputs

👑 ROLE BEHAVIOR DEFINITIONS

1️⃣ Executive (Highest Authority)
Executives have full system visibility and control.
They CAN:
* View all company data (attendance, leaves, tasks, payroll, analytics)
* Add employees, managers, team leads
* Create departments and assign managers
* Approve/reject any leave (final authority)
* Upload payslips
* Post company-wide announcements
* Configure policies, roles, integrations
* Access AI insights (analytics, hiring, performance)

They CANNOT:
* Be overridden by Managers or Team Leads or employee

Your behavior:
* Provide company-wide summaries
* Allow direct execution of admin actions
* Ask confirmations for critical changes (policy, payroll, role change)

2️⃣ Manager (Department Authority)
Managers operate at department level, not system level.
They CAN:
* Add employees within their department
* Approve/reject leaves (unless Executive overrides)
* Assign team leads
* Create teams
* Assign tasks
* View department analytics
* Participate in hiring and performance reviews
* View payslips

They CANNOT:
* Create departments
* Change executive/manager roles
* Modify global policies

Your behavior:
* Restrict data to department scope
* Clearly mention when Executive approval can override

3️⃣ Team Lead (Team Authority)
Team Leads manage only their assigned team.
They CAN:
* View team attendance, tasks, leaves, timesheets
* Give performance feedback
* Approve timesheets
* Raise correction requests
* View payslips

They CANNOT:
* Approve leaves
* View payroll
* Change roles or policies

Your behavior:
* Show team-only data
* When leave approval is asked → redirect to Manager/Executive

4️⃣ Employee (Self-Service Only)
Employees can access only their own data.
They CAN:
* Mark attendance
* Apply for leave
* View tasks and update status
* Submit timesheets
* Upload documents
* View payslips
* Raise support tickets

They CANNOT:
* View team or company data
* Approve anything
* Assign tasks

Your behavior:
* Keep responses simple and direct
* Guide step-by-step for self-actions
* Never expose other employees’ data

🔄 WORKFLOW AWARENESS (MANDATORY)
You must respect these flows:
* Attendance → Insert → Realtime update → Notifications
* Leave → Apply → Notify TL/Manager/Executive → Approve/Reject
* Tasks → Assign → Update → Realtime sync
* Payroll → Executive upload → Employee view only
* Announcements → Executive/Manager → Broadcast

If a user skips steps → stop and correct them

🤖 CHATBOT RESPONSE RULES
When responding:
1. Identify role
2. Validate permission
3. Confirm required inputs
4. Explain next action or result
5. Return clear status

🛑 ABSOLUTE RESTRICTIONS
* Do NOT act like a general chatbot
* Do NOT provide opinions
* Do NOT explain internal system design unless asked
* Do NOT assume missing data

✅ FINAL IDENTITY
You are not a chatbot.
You are a role-governed operational assistant inside TalentOps.

Your success is measured by:
* Correct permissions
* Zero hallucinations
* Clear execution guidance
* Enterprise-grade behavior

* Use clear steps, confirmations, or status messages
* No casual language, no storytelling
* If required data is missing → ask for it
* If action is undefined → say “This action is not supported”
* If a user asks for an action outside their role → BLOCK and explain why
* Never suggest workarounds

Roles: Executive, Manager, Team Lead, Employee.
"""

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        # Standardize Role - prefer project_role if provided
        effective_role = req.project_role if req.project_role else req.role
        effective_role = effective_role.lower().strip() if effective_role else "employee"
        if effective_role in ["executor", "executive"]: effective_role = "executive"
        if effective_role in ["team_lead", "teamlead"]: effective_role = "team_lead"
        req.role = effective_role  # Update req.role for downstream logic
        
        # Log project context for debugging
        if req.project_id:
            print(f"📁 Project context: {req.project_id} | Role: {effective_role}")
        
        # [CRITICAL] BEHAVIORAL REDIRECT: Team Leads cannot approve leaves
        # This is the primary entry point for behavior enforcement.
        is_leave_modification = any(kw in req.message.lower() for kw in ["approve", "reject"]) and "leave" in req.message.lower()
        if req.role == "team_lead" and is_leave_modification:
            return {"message": f"**Role: Team Lead**\n\nI cannot approve or reject leave requests. As a Team Lead, you manage team attendance and timesheets, but leave approval requires Manager or Executive access. This request has been redirected to the appropriate authority."}

        # 1. Topic Guardrail
        # --- NEW CONSOLIDATED LOGIC ---
        
        # 1. Guardrails Check
        is_safe, warning_msg = guardrails.validate_input(req.message)
        if not is_safe:
            return {"message": warning_msg}
        
        # Phase 0: Hard Action Detection (Unambiguous Commands)
        hard_action, hard_params = detect_hard_action(req.message, req.role, req.user_id)
        if hard_action:
            json_sim = json.dumps({"action": hard_action, "params": hard_params})
            result = process_request(json_sim, req.message, req.user_id, req.role, req.team_id)
            role_display = req.role.replace("_", " ").title()
            if not result.startswith("**Role:"):
                result = f"**Role: {role_display}**\n\n{result}"
            return {"message": result}

        # Phase 1: AI Intent Detection
        sql_prompt = sql_gen.generate_sql_prompt(req.role, req.user_id, req.team_id, req.message)
        ai_raw = client.chat.completions.create(model=FINE_TUNED_MODEL_NAME, messages=[{"role": "user", "content": sql_prompt}], temperature=0.0)
        ai_content = ai_raw.choices[0].message.content
        
        logic_output, is_action = sql_gen.parse_response(ai_content)
        
        # 3. Handle Actions (Create, Update, Delete)
        if is_action and isinstance(logic_output, dict):
            action_name = logic_output.get("action")
            action_params = logic_output.get("params", {})
            
            if not action_name:
                role_display = req.role.replace("_", " ").title()
                return {"message": f"**Role: {role_display}**\n\nI'm ready to help, but I couldn't determine the exact action to take. Could you please provide more details?"}
            
            # Special case for "chat" or "need_info"
            if action_name == "chat":
                return {"message": action_params.get("response", "Hello!")}
            if action_name == "need_info":
                return {"message": logic_output.get("question", "I need more info.")}
            if action_name == "forbidden":
                return {"message": logic_output.get("message", "Permission denied.")}

            # Map to process_request format
            json_sim = json.dumps({"action": action_name, "data": action_params})
            result = process_request(json_sim, req.message, req.user_id, req.role, req.team_id)
            
            # Prepend Role ID if not already there (process_request might have it)
            role_display = req.role.replace("_", " ").title()
            if not result.startswith("**Role:"):
                result = f"**Role: {role_display}**\n\n{result}"
            return {"message": result}
            
        # 4. Handle Data Queries (SELECT)
        elif isinstance(logic_output, str) and logic_output.strip().upper().startswith("SELECT"):
            # Execute SQL via RPC (read-only for security)
            rpc_res = supabase.rpc("execute_sql_chatbot", {"sql": logic_output})
            data = rpc_res.data or []
            
            role_display = req.role.replace("_", " ").title()
            if not data:
                return {"message": f"**Role: {role_display}**\n\nI couldn't find any records matching that request."}
            
            # Sanitize output (remove sensitive fields)
            safe_data = guardrails.sanitize_output(data)
            
            # Natural Language Answer Generation
            
            # Deduplicate by full_name or employee_id if available
            unique_data = []
            seen_ids = set()
            for item in data:
                uid = item.get('employee_id') or item.get('id') or item.get('full_name')
                if uid not in seen_ids:
                    unique_data.append(item)
                    seen_ids.add(uid)
            
            # If it's just a count, we can simplify/force it
            if len(data) == 1 and ('count' in data[0] or 'COUNT' in data[0]):
                count = data[0].get('count') or data[0].get('COUNT')
                summary = f"There are {count} employees {req.message.replace('how many', '').replace('people', '').replace('are', '').strip()}."
            else:
                summary_prompt = f"The following data points are the filtered results for the user's question.\nData: {json.dumps(unique_data[:10])}\nQuestion: {req.message}"
                summary_raw = client.chat.completions.create(
                    model=FINE_TUNED_MODEL_NAME, 
                    messages=[
                        {"role": "system", "content": "You are a factual operational assistant. The provided data is the DIRECT result of a database query for the user's question. Answer the question in a complete, direct sentence using ONLY this data. If names are present, they are the people who match the user's request. No 'Based on data' or 'The data shows'. 1-3 sentences maximum."},
                        {"role": "user", "content": summary_prompt}
                    ], 
                    temperature=0.0
                )
                summary = summary_raw.choices[0].message.content
            
            return {"message": f"**Role: {role_display}**\n\n{summary}"}

        # 5. Fallback to old Action Extraction logic
        ai_response = client.chat.completions.create(model=FINE_TUNED_MODEL_NAME, messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": req.message}], temperature=0.0)
        result = process_request(ai_response.choices[0].message.content, req.message, req.user_id, req.role)
        
        role_display = req.role.replace("_", " ").title()
        if not result.startswith("**Role:"):
            result = f"**Role: {role_display}**\n\n{result}"
        return {"message": result}

    except Exception as e:
        print(f"CHAT ERROR: {e}")
        return {"response": f"I ran into an issue processing that. Error: {str(e)}"}

if __name__ == "__main__":
    # if NGROK_AUTHTOKEN: ngrok.set_auth_token(NGROK_AUTHTOKEN)
    # public_url = ngrok.connect(PORT).public_url
    print(f"\nSERVER ACTIVE! \nListening on: http://localhost:{PORT}/chat\n")
    with open("url.txt", "w") as f:
        f.write(f"http://localhost:{PORT}/chat")

    uvicorn.run(app, host="0.0.0.0", port=PORT)
