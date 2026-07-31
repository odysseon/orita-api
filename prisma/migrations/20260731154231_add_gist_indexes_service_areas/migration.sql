-- Create GiST indexes for spatial queries
CREATE INDEX business_service_areas_center_geography_idx ON "business_service_areas" USING GIST ("centerGeography");
CREATE INDEX business_service_areas_polygon_geometry_idx ON "business_service_areas" USING GIST ("polygonGeometry");

CREATE INDEX listing_service_areas_center_geography_idx ON "listing_service_areas" USING GIST ("centerGeography");
CREATE INDEX listing_service_areas_polygon_geometry_idx ON "listing_service_areas" USING GIST ("polygonGeometry");

-- Create B-tree indexes for fast equality and filtering
CREATE INDEX business_service_areas_admin_enabled_type_idx ON "business_service_areas" ("administrativeRegionId", "enabled", "type");
CREATE INDEX listing_service_areas_admin_enabled_type_idx ON "listing_service_areas" ("administrativeRegionId", "enabled", "type");

-- Backfill: Create a default 10km radius service area for legacy businesses that have a location but no service area
INSERT INTO "business_service_areas" (
  "id",
  "businessProfileId",
  "type",
  "radiusKm",
  "centerGeography",
  "enabled",
  "displayOrder",
  "createdAt",
  "updatedAt"
)
SELECT 
  gen_random_uuid()::text,
  bp."id",
  'RADIUS'::"ServiceAreaType",
  10,
  loc."coordinates"::geography,
  true,
  0,
  NOW(),
  NOW()
FROM "business_profiles" bp
INNER JOIN "locations" loc ON bp."locationId" = loc.id
LEFT JOIN "business_service_areas" bsa ON bp."id" = bsa."businessProfileId"
WHERE bsa."id" IS NULL AND loc."coordinates" IS NOT NULL;