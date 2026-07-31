// @ts-nocheck
import pg from 'pg';
const connectionString = process.env.DATABASE_URL || 'postgresql://orita:orita12345@localhost:5432/orita?schema=public';
const pool = new pg.Pool({ connectionString });
// Test Locations
const LAGOS = { lat: 6.5244, lng: 3.3792 };
const IFE = { lat: 7.4815, lng: 4.5422 };
const IBADAN = { lat: 7.3775, lng: 3.947 };
async function runTests() {
    console.log('--- Starting Spatial Search Tests ---');
    const client = await pool.connect();
    try {
        // 1. Setup Test Data
        await client.query(`
      INSERT INTO "Account" (id, email, "createdAt")
      VALUES 
        ('test_acc_1', 'spatial1@test.com', NOW()),
        ('test_acc_2', 'spatial2@test.com', NOW()),
        ('test_acc_3', 'spatial3@test.com', NOW()),
        ('test_acc_4', 'spatial4@test.com', NOW())
    `);
        await client.query(`
      INSERT INTO users (id, "accountId", username, role, "createdAt", "updatedAt") 
      VALUES 
        ('test_user_1', 'test_acc_1', 'sp_tester1', 'USER', NOW(), NOW()),
        ('test_user_2', 'test_acc_2', 'sp_tester2', 'USER', NOW(), NOW()),
        ('test_user_3', 'test_acc_3', 'sp_tester3', 'USER', NOW(), NOW()),
        ('test_user_4', 'test_acc_4', 'sp_tester4', 'USER', NOW(), NOW())
    `);
        await client.query(`
      INSERT INTO locations (id, name, latitude, longitude, provider, coordinates, "createdAt", "updatedAt") 
      VALUES ('loc_lagos', 'Lagos', $1, $2, 'TEST', ST_SetSRID(ST_MakePoint($2, $1), 4326), NOW(), NOW())
    `, [LAGOS.lat, LAGOS.lng]);
        await client.query(`
      INSERT INTO locations (id, name, latitude, longitude, provider, coordinates, "createdAt", "updatedAt") 
      VALUES ('loc_ibadan', 'Ibadan', $1, $2, 'TEST', ST_SetSRID(ST_MakePoint($2, $1), 4326), NOW(), NOW())
    `, [IBADAN.lat, IBADAN.lng]);
        // Insert Businesses
        await client.query(`
      INSERT INTO business_profiles (id, "ownerId", name, slug, "isPublic", "businessType", "locationId", "createdAt", "updatedAt") 
      VALUES 
      ('biz_lagos_nationwide', 'test_user_1', 'Nationwide', 'nationwide', true, 'PHYSICAL', 'loc_lagos', NOW(), NOW()),
      ('biz_disabled_sa', 'test_user_2', 'Disabled', 'disabled', true, 'PHYSICAL', 'loc_lagos', NOW(), NOW()),
      ('biz_legacy', 'test_user_3', 'Legacy', 'legacy', true, 'PHYSICAL', 'loc_lagos', NOW(), NOW()),
      ('biz_radius', 'test_user_4', 'Radius', 'radius', true, 'PHYSICAL', 'loc_ibadan', NOW(), NOW())
    `);
        // Insert Service Areas
        await client.query(`
      INSERT INTO business_service_areas (id, "businessProfileId", type, enabled, "createdAt", "updatedAt") 
      VALUES 
      ('sa_nationwide', 'biz_lagos_nationwide', 'NATIONWIDE', true, NOW(), NOW()),
      ('sa_disabled', 'biz_disabled_sa', 'NATIONWIDE', false, NOW(), NOW())
    `);
        await client.query(`
      INSERT INTO business_service_areas (id, "businessProfileId", type, "radiusKm", "centerGeography", enabled, "createdAt", "updatedAt") 
      VALUES 
      ('sa_radius', 'biz_radius', 'RADIUS', 80, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, true, NOW(), NOW())
    `, [IBADAN.lng, IBADAN.lat]);
        // 2. Run Tests against BusinessSearchService logic
        console.log('\\nTest 1: Business in Lagos serving nationwide is discoverable from Ife');
        const t1 = await client.query(`
        SELECT bp.id
        FROM "business_profiles" bp
        JOIN "locations" loc ON bp."locationId" = loc.id
        LEFT JOIN "business_service_areas" bsa ON bsa."businessProfileId" = bp.id AND bsa.enabled = true
        WHERE bp.id = 'biz_lagos_nationwide' AND (
          (bsa.type = 'NATIONWIDE')
          OR (bsa.id IS NULL AND loc.coordinates IS NOT NULL AND ST_DWithin(
            loc.coordinates::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            15000
          ))
        )
    `, [IFE.lng, IFE.lat]);
        console.assert(t1.rows.length === 1, 'Test 1 Failed: Nationwide business not found');
        console.log(t1.rows.length === 1 ? '✅ Passed' : '❌ Failed');
        console.log('\\nTest 2: Business with a disabled service area is excluded');
        const t2 = await client.query(`
        SELECT bp.id
        FROM "business_profiles" bp
        JOIN "locations" loc ON bp."locationId" = loc.id
        LEFT JOIN "business_service_areas" bsa ON bsa."businessProfileId" = bp.id AND bsa.enabled = true
        WHERE bp.id = 'biz_disabled_sa' AND (
          (bsa.type = 'NATIONWIDE')
        )
    `);
        console.assert(t2.rows.length === 0, 'Test 2 Failed: Disabled service area was included');
        console.log(t2.rows.length === 0 ? '✅ Passed' : '❌ Failed');
        console.log('\\nTest 3: Legacy business without service areas still works if compatibility layer remains');
        const t3 = await client.query(`
        SELECT bp.id
        FROM "business_profiles" bp
        JOIN "locations" loc ON bp."locationId" = loc.id
        LEFT JOIN "business_service_areas" bsa ON bsa."businessProfileId" = bp.id AND bsa.enabled = true
        WHERE bp.id = 'biz_legacy' AND (
          (bsa.id IS NULL AND loc.coordinates IS NOT NULL AND ST_DWithin(
            loc.coordinates::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            15000
          ))
        )
    `, [LAGOS.lng, LAGOS.lat]);
        console.assert(t3.rows.length === 1, 'Test 3 Failed: Legacy business was not found at its own location');
        console.log(t3.rows.length === 1 ? '✅ Passed' : '❌ Failed');
        console.log('\\nTest 4: Radius service area behaves correctly near its boundary');
        const t4a = await client.query(`
        SELECT bp.id
        FROM "business_profiles" bp
        JOIN "locations" loc ON bp."locationId" = loc.id
        LEFT JOIN "business_service_areas" bsa ON bsa."businessProfileId" = bp.id AND bsa.enabled = true
        WHERE bp.id = 'biz_radius' AND (
          (bsa.type = 'RADIUS' AND ST_DWithin(
            bsa."centerGeography",
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            bsa."radiusKm" * 1000
          ))
        )
    `, [IFE.lng, IFE.lat]);
        console.assert(t4a.rows.length === 1, 'Test 4a Failed: Radius (80km) did not reach Ife (70km)');
        console.log(t4a.rows.length === 1 ? '✅ Passed (Inside Boundary)' : '❌ Failed');
        const t4b = await client.query(`
        SELECT bp.id
        FROM "business_profiles" bp
        JOIN "locations" loc ON bp."locationId" = loc.id
        LEFT JOIN "business_service_areas" bsa ON bsa."businessProfileId" = bp.id AND bsa.enabled = true
        WHERE bp.id = 'biz_radius' AND (
          (bsa.type = 'RADIUS' AND ST_DWithin(
            bsa."centerGeography",
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            bsa."radiusKm" * 1000
          ))
        )
    `, [LAGOS.lng, LAGOS.lat]);
        console.assert(t4b.rows.length === 0, 'Test 4b Failed: Radius (80km) erroneously reached Lagos (115km)');
        console.log(t4b.rows.length === 0 ? '✅ Passed (Outside Boundary)' : '❌ Failed');
    }
    finally {
        console.log('\\n--- Cleaning Up ---');
        await client.query(`DELETE FROM business_service_areas WHERE "businessProfileId" IN ('biz_lagos_nationwide', 'biz_disabled_sa', 'biz_legacy', 'biz_radius')`);
        await client.query(`DELETE FROM business_profiles WHERE id IN ('biz_lagos_nationwide', 'biz_disabled_sa', 'biz_legacy', 'biz_radius')`);
        await client.query(`DELETE FROM locations WHERE id IN ('loc_lagos', 'loc_ibadan')`);
        await client.query(`DELETE FROM users WHERE id IN ('test_user_1', 'test_user_2', 'test_user_3', 'test_user_4')`);
        await client.query(`DELETE FROM "Account" WHERE id IN ('test_acc_1', 'test_acc_2', 'test_acc_3', 'test_acc_4')`);
        client.release();
        await pool.end();
    }
}
runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
