# Auth validation and token capture

# --- 1. Invalid credentials ---
POST {{api_url}}/api/auth/login
Content-Type: application/json
{
  "email": "{{owner_email}}",
  "password": "WrongPassword123!"
}
HTTP 401
[Asserts]
jsonpath "$.message" == "Invalid credentials"

# --- 2. Owner login ---
POST {{api_url}}/api/auth/login
Content-Type: application/json
{
  "email": "{{owner_email}}",
  "password": "{{owner_password}}"
}
HTTP 200
[Captures]
owner_token: jsonpath "$.token"
[Asserts]
jsonpath "$.token" isString
jsonpath "$.expiresAt" isString

# --- 3. Reviewer login ---
POST {{api_url}}/api/auth/login
Content-Type: application/json
{
  "email": "{{reviewer_email}}",
  "password": "{{reviewer_password}}"
}
HTTP 200
[Captures]
reviewer_token: jsonpath "$.token"
[Asserts]
jsonpath "$.token" isString

# --- 4. Intruder login ---
POST {{api_url}}/api/auth/login
Content-Type: application/json
{
  "email": "{{intruder_email}}",
  "password": "{{intruder_password}}"
}
HTTP 200
[Captures]
intruder_token: jsonpath "$.token"
[Asserts]
jsonpath "$.token" isString
