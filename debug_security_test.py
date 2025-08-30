#!/usr/bin/env python3
"""
Debug Security Test - Focused testing to identify specific issues
"""

import requests
import json
import time

BASE_URL = "https://fintrack-app-20.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def test_auth_flow():
    """Test complete authentication flow"""
    print("=== Testing Authentication Flow ===")
    
    # 1. Register a user
    user_data = {
        "email": f"debug_user_{int(time.time())}@test.com",
        "password": "SecurePass123!"
    }
    
    print("1. Testing user registration...")
    response = requests.post(f"{BASE_URL}/auth/register", json=user_data, headers=HEADERS)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.text[:200]}...")
    
    if response.status_code == 200:
        auth_data = response.json()
        access_token = auth_data.get("access_token")
        print(f"   ✅ Registration successful, got token: {access_token[:20]}...")
        
        # 2. Test protected endpoint with valid token
        print("\n2. Testing protected endpoint with valid token...")
        auth_headers = {**HEADERS, "Authorization": f"Bearer {access_token}"}
        tx_response = requests.get(f"{BASE_URL}/transactions", headers=auth_headers)
        print(f"   Status: {tx_response.status_code}")
        print(f"   Response: {tx_response.text[:200]}...")
        
        # 3. Test protected endpoint with invalid token
        print("\n3. Testing protected endpoint with invalid token...")
        invalid_headers = {**HEADERS, "Authorization": "Bearer invalid_token_here"}
        invalid_response = requests.get(f"{BASE_URL}/transactions", headers=invalid_headers)
        print(f"   Status: {invalid_response.status_code}")
        print(f"   Response: {invalid_response.text[:200]}...")
        
        # 4. Test protected endpoint without token
        print("\n4. Testing protected endpoint without token...")
        no_auth_response = requests.get(f"{BASE_URL}/transactions", headers=HEADERS)
        print(f"   Status: {no_auth_response.status_code}")
        print(f"   Response: {no_auth_response.text[:200]}...")
        
    else:
        print(f"   ❌ Registration failed: {response.text}")

def test_security_headers():
    """Test security headers"""
    print("\n=== Testing Security Headers ===")
    response = requests.get(f"{BASE_URL}/health", headers=HEADERS)
    print(f"Status: {response.status_code}")
    print("Headers:")
    for header, value in response.headers.items():
        if any(security_header in header.lower() for security_header in 
               ['x-content-type', 'x-frame', 'x-xss', 'referrer', 'content-security']):
            print(f"   {header}: {value}")

def test_rate_limiting():
    """Test rate limiting"""
    print("\n=== Testing Rate Limiting ===")
    
    # Test health endpoint (should allow multiple requests)
    print("Testing health endpoint rate limiting...")
    for i in range(3):
        response = requests.get(f"{BASE_URL}/health", headers=HEADERS)
        print(f"   Request {i+1}: Status {response.status_code}")
        time.sleep(0.1)
    
    # Test registration rate limiting
    print("\nTesting registration rate limiting...")
    for i in range(3):
        user_data = {
            "email": f"rate_test_{i}_{int(time.time())}@test.com",
            "password": "SecurePass123!"
        }
        response = requests.post(f"{BASE_URL}/auth/register", json=user_data, headers=HEADERS)
        print(f"   Registration {i+1}: Status {response.status_code}")
        if response.status_code == 429:
            print(f"   ✅ Rate limiting working!")
            break
        time.sleep(0.1)

def test_input_validation():
    """Test input validation"""
    print("\n=== Testing Input Validation ===")
    
    # Test weak password
    weak_data = {
        "email": "weak@test.com",
        "password": "weak"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=weak_data, headers=HEADERS)
    print(f"Weak password test: Status {response.status_code}")
    if response.status_code == 422:
        print("   ✅ Weak password correctly rejected")
    else:
        print(f"   ❌ Weak password not rejected: {response.text[:100]}")

def test_payment_validation():
    """Test payment validation"""
    print("\n=== Testing Payment Validation ===")
    
    # First register a user to get auth token
    user_data = {
        "email": f"payment_test_{int(time.time())}@test.com",
        "password": "SecurePass123!"
    }
    
    reg_response = requests.post(f"{BASE_URL}/auth/register", json=user_data, headers=HEADERS)
    if reg_response.status_code == 200:
        token = reg_response.json()["access_token"]
        auth_headers = {**HEADERS, "Authorization": f"Bearer {token}"}
        
        # Test invalid payment amount
        invalid_payment = {
            "amount": 50,  # Below minimum
            "currency": "INR",
            "plan_type": "premium"
        }
        
        response = requests.post(f"{BASE_URL}/payments/create-order", 
                               json=invalid_payment, headers=auth_headers)
        print(f"Invalid payment amount test: Status {response.status_code}")
        if response.status_code == 422:
            print("   ✅ Invalid payment amount correctly rejected")
        else:
            print(f"   Response: {response.text[:200]}")

if __name__ == "__main__":
    test_auth_flow()
    test_security_headers()
    test_rate_limiting()
    test_input_validation()
    test_payment_validation()