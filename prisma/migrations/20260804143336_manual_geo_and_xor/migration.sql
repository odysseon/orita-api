-- Step 1: Change Location coordinates type from geometry to geography(Point,4326)
-- We use ST_SetSRID because the pre-flight check showed 0 rows, so this handles both empty and 0 SRID cases perfectly.
ALTER TABLE locations
  ALTER COLUMN coordinates TYPE geography(Point,4326)
  USING ST_SetSRID(coordinates, 4326)::geography;

-- Step 2: Add ConversationAnchor XOR constraint
ALTER TABLE conversation_anchors
ADD CONSTRAINT conversation_anchor_exactly_one_fk CHECK (
  (CASE WHEN "businessId"    IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "listingId"     IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "tourId"        IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "locationId"    IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "opportunityId" IS NOT NULL THEN 1 ELSE 0 END) = 1
);