# Test getting authenticated account profile

# --- 1. Missing Token ---
GET {{api_url}}/api/identity/me
HTTP 401

# --- 2. Invalid Token ---
GET {{api_url}}/api/identity/me
Authorization: Bearer invalid.token.value
HTTP 401

# --- 3. Valid Token (Owner) ---
GET {{api_url}}/api/identity/me
Authorization: Bearer {{owner_token}}
HTTP 200
[Asserts]
jsonpath "$.accountId" isString
jsonpath "$.expiresAt" isString
