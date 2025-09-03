# spendwise_local_tester.py
import requests
import json
from pprint import pprint

# -------------------------------
# CONFIGURATION
# -------------------------------
BASE_URL = "http://localhost:8001/api"  # Updated to correct backend port
TEST_USER = {
    "email": "testuser@example.com",
    "password": "StrongPass123!"
}

HEADERS = {"Content-Type": "application/json"}

# -------------------------------
# HELPER FUNCTIONS
# -------------------------------
def print_result(task_name, response):
    status = "✅ PASS" if response.status_code < 400 else "❌ FAIL"
    print(f"{status} - {task_name} (HTTP {response.status_code})")
    try:
        pprint(response.json())
    except Exception:
        print(response.text)
    print("-"*50)

def auth_register():
    url = f"{BASE_URL}/auth/register"
    payload = {
        "email": TEST_USER["email"],
        "password": TEST_USER["password"],
        "full_name": "Test User"
    }
    resp = requests.post(url, json=payload, headers=HEADERS)
    print_result("Register User", resp)
    return resp

def auth_login():
    url = f"{BASE_URL}/auth/login"
    resp = requests.post(url, json=TEST_USER, headers=HEADERS)
    print_result("Login User", resp)
    if resp.status_code == 200:
        tokens = resp.json()
        return tokens.get("access_token"), tokens.get("refresh_token")
    return None, None

def auth_refresh(refresh_token):
    url = f"{BASE_URL}/auth/refresh"
    resp = requests.post(url, json={"refresh_token": refresh_token}, headers=HEADERS)
    print_result("Refresh Token", resp)
    if resp.status_code == 200:
        return resp.json().get("access_token")
    return None

def health_check():
    resp = requests.get(f"http://localhost:8001/health", headers=HEADERS)
    print_result("Health Check", resp)

def create_transaction(token):
    url = f"{BASE_URL}/transactions"
    headers = HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    payload = {
        "type": "expense",
        "amount": 1000,
        "currency": "INR",
        "categoryId": "demo-category",
        "note": "Test transaction",
        "timestamp": 1725369600000  # Unix timestamp in milliseconds
    }
    resp = requests.post(url, json=payload, headers=headers)
    print_result("Create Transaction", resp)
    if resp.status_code == 200:
        return resp.json().get("id")
    return None

def get_transactions(token):
    url = f"{BASE_URL}/transactions"
    headers = HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    resp = requests.get(url, headers=headers)
    print_result("Get Transactions", resp)

def update_transaction(token, tx_id):
    url = f"{BASE_URL}/transactions/{tx_id}"
    headers = HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    payload = {"amount": 1200}
    resp = requests.put(url, json=payload, headers=headers)
    print_result("Update Transaction", resp)

def delete_transaction(token, tx_id):
    url = f"{BASE_URL}/transactions/{tx_id}"
    headers = HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    resp = requests.delete(url, headers=headers)
    print_result("Delete Transaction", resp)

def get_budgets(token):
    url = f"{BASE_URL}/budgets"
    headers = HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    resp = requests.get(url, headers=headers)
    print_result("Get Budgets", resp)

def create_budget(token):
    url = f"{BASE_URL}/budgets"
    headers = HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    payload = {"categoryId":"demo-category","amount":5000,"period":"monthly"}
    resp = requests.post(url, json=payload, headers=headers)
    print_result("Create Budget", resp)

def get_bills(token):
    url = f"{BASE_URL}/bills"
    headers = HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    resp = requests.get(url, headers=headers)
    print_result("Get Bills", resp)

def create_bill(token):
    url = f"{BASE_URL}/bills"
    headers = HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    payload = {"name":"Electricity","amount":1200,"dueDate":"2025-09-10","recurring":"monthly"}
    resp = requests.post(url, json=payload, headers=headers)
    print_result("Create Bill", resp)

def premium_upgrade(token):
    url = f"{BASE_URL}/premium/upgrade"
    headers = HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    payload = {"planType":"premium_monthly"}
    resp = requests.post(url, json=payload, headers=headers)
    print_result("Upgrade Premium", resp)

def premium_status(token):
    url = f"{BASE_URL}/premium/status"
    headers = HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    resp = requests.get(url, headers=headers)
    print_result("Premium Status", resp)

def ai_analysis(token):
    url = f"{BASE_URL}/ai/analyze"
    headers = HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    payload = {
        "user_id": "test-user",
        "analysis_type": "spending_patterns",
        "time_period": "current_month"
    }
    resp = requests.post(url, json=payload, headers=headers)
    print_result("AI Analysis", resp)

def monthly_report(token):
    url = f"{BASE_URL}/analytics/monthly-report"
    headers = HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    resp = requests.get(url, headers=headers)
    print_result("Monthly Report", resp)

def ledger_verify(token):
    url = f"{BASE_URL}/ledger/verify"
    headers = HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    resp = requests.get(url, headers=headers)
    print_result("Ledger Verification", resp)

# -------------------------------
# MAIN TEST SEQUENCE
# -------------------------------
if __name__ == "__main__":
    print("=== SPENDWISE LOCAL TESTER ===")
    health_check()
    
    # Authentication
    auth_register()
    access_token, refresh_token = auth_login()
    if not access_token:
        print("❌ Cannot login, aborting tests")
        exit(1)
    
    # Test premium status (should be free for all)
    premium_status(access_token)
    
    # Transactions
    tx_id = create_transaction(access_token)
    get_transactions(access_token)
    if tx_id:
        update_transaction(access_token, tx_id)
        # Don't delete yet, keep for analysis
    
    # AI Features (now free)
    ai_analysis(access_token)
    monthly_report(access_token)

    # Budgets & Bills
    create_budget(access_token)
    get_budgets(access_token)
    create_bill(access_token)
    get_bills(access_token)

    # Premium
    premium_upgrade(access_token)

    # Ledger verification
    ledger_verify(access_token)

    # Token refresh
    new_access = auth_refresh(refresh_token)
    if new_access:
        print("✅ Token refresh successful")

    print("=== ALL TESTS COMPLETED ===")