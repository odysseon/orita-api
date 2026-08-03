# Opportunity Lifecycle Test (Create -> Find -> Reply -> Soft Delete)

# --- 1. Owner creates an opportunity ---
POST {{api_url}}/api/opportunities
Authorization: Bearer {{owner_token}}
Content-Type: application/json
{
  "type": "FOR_SALE",
  "title": "Vintage Bicycle",
  "body": "Selling my old vintage bicycle in good condition.",
  "locationId": "{{location_id}}"
}
HTTP 201
[Captures]
opportunity_id: jsonpath "$.id"
[Asserts]
jsonpath "$.id" isString
jsonpath "$.title" == "Vintage Bicycle"
jsonpath "$.status" == "ACTIVE"

# --- 2. Reviewer finds the opportunity nearby ---
# We need to make sure the location matches. The location `loc_test_1` needs to be seeded, or we should use a known seeded location.
# Let's assume `loc_test_1` is valid or there's a seeded one.
GET {{api_url}}/api/nearby?lat={{lat}}&lng={{lng}}&radiusKm=100
Authorization: Bearer {{reviewer_token}}
HTTP 200
[Asserts]
jsonpath "$[*].id" includes "{{opportunity_id}}"

# --- 3. Reviewer replies to the opportunity (Start Conversation) ---
POST {{api_url}}/api/conversations/open
Authorization: Bearer {{reviewer_token}}
Content-Type: application/json
{
  "targetType": "OPPORTUNITY",
  "targetId": "{{opportunity_id}}"
}
HTTP 201
[Captures]
conversation_id: jsonpath "$.id"
[Asserts]
jsonpath "$.anchor.type" == "OPPORTUNITY"
jsonpath "$.anchor.targetId" == "{{opportunity_id}}"

# --- 4. Owner soft deletes the opportunity ---
DELETE {{api_url}}/api/opportunities/{{opportunity_id}}
Authorization: Bearer {{owner_token}}
HTTP 204

# --- 5. Reviewer searches nearby and it's gone ---
GET {{api_url}}/api/nearby?lat={{lat}}&lng={{lng}}&radiusKm=100
Authorization: Bearer {{reviewer_token}}
HTTP 200
[Asserts]
jsonpath "$[*].id" not includes "{{opportunity_id}}"

# --- 5b. Reviewer attempting to open a conversation on the DELETED opportunity fails ---
POST {{api_url}}/api/conversations/open
Authorization: Bearer {{reviewer_token}}
Content-Type: application/json
{
  "targetType": "OPPORTUNITY",
  "targetId": "{{opportunity_id}}"
}
HTTP 400

# --- 6. Reviewer can still view the conversation ---
GET {{api_url}}/api/conversations/{{conversation_id}}
Authorization: Bearer {{reviewer_token}}
HTTP 200
[Asserts]
jsonpath "$.id" == "{{conversation_id}}"
jsonpath "$.anchor.title" == "Vintage Bicycle"
