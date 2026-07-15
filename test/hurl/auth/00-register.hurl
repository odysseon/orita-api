# Register accounts (idempotent — 201 on first run, 409 on reruns)

# --- 1. Test validation error (weak password, missing username) ---
POST {{api_url}}/api/accounts/register
Content-Type: application/json
{
  "email": "invalid_email",
  "password": "weak"
}
HTTP 400
[Asserts]
jsonpath "$.message" isCollection

# --- 2. Register owner ---
POST {{api_url}}/api/accounts/register
Content-Type: application/json
{
  "email": "{{owner_email}}",
  "password": "{{owner_password}}",
  "username": "owner"
}
HTTP *
[Asserts]
status toString matches "^(201|409)$"

# --- 3. Register reviewer ---
POST {{api_url}}/api/accounts/register
Content-Type: application/json
{
  "email": "{{reviewer_email}}",
  "password": "{{reviewer_password}}",
  "username": "reviewer"
}
HTTP *
[Asserts]
status toString matches "^(201|409)$"

# --- 4. Register intruder ---
POST {{api_url}}/api/accounts/register
Content-Type: application/json
{
  "email": "{{intruder_email}}",
  "password": "{{intruder_password}}",
  "username": "intruder"
}
HTTP *
[Asserts]
status toString matches "^(201|409)$"
