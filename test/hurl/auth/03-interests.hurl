# Test User Interests

# We assume a category with slug "test-category" exists or we'll just insert one via DB before running.
# Wait, let's capture a category id from the public API.
GET {{api_url}}/api/categories
HTTP 200
[Captures]
first_category_id: jsonpath "$[0].id"

# --- 1. Add Interest ---
POST {{api_url}}/api/users/me/interests
Authorization: Bearer {{owner_token}}
Content-Type: application/json
{
  "categoryId": "{{first_category_id}}"
}
HTTP 201

# --- 2. Verify Interest Added ---
GET {{api_url}}/api/users/me
Authorization: Bearer {{owner_token}}
HTTP 200
[Asserts]
jsonpath "$.interestedCategories" includes "{{first_category_id}}"

# --- 3. Remove Interest ---
DELETE {{api_url}}/api/users/me/interests/{{first_category_id}}
Authorization: Bearer {{owner_token}}
HTTP 200

# --- 4. Verify Interest Removed ---
GET {{api_url}}/api/users/me
Authorization: Bearer {{owner_token}}
HTTP 200
[Asserts]
jsonpath "$.interestedCategories" not includes "{{first_category_id}}"
