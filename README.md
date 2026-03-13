# ModalGateway Backend Guide

This guide provides simple steps to set up and run the Unified Server.

## 1. Prerequisites
- Python 3.10 or higher installed.
- Access to Supabase and Together AI (for API keys).

## 2. Environment Setup
Open your terminal in this directory and run:

```powershell
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\activate
```

## 3. Install Dependencies
```powershell
pip install -r requirements.txt
```

## 4. Configuration
1.  Locate the `.env.example` file.
2.  Create a copy named `.env`.
3.  Fill in your API keys for:
    - `TOGETHER_API_KEY`
    - `SUPABASE_URL`
    - `SUPABASE_SERVICE_ROLE_KEY`

## 5. Run the Server
Simply run the following command:

```powershell
python unified_server.py
```

The server will start on `http://localhost:8035` by default.

---
**Note:** If you are running the frontend as well, ensure the `VITE_CHATBOT_URL` in the frontend environment matches the backend port.
