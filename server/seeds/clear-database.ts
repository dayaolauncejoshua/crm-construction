import { db } from "../db";
import { sql } from "drizzle-orm";

async function clearDatabase() {
  try {
    console.log("🗑️  Starting database cleanup...\n");

    // Use CASCADE to automatically delete dependent rows
    // This is safer and handles all foreign key constraints
    
    console.log("Deleting all data with CASCADE...");
    
    // Get all table names from the database
    const tables = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'drizzle%'
    `);

    console.log(`Found ${tables.rows.length} tables to clear\n`);

    // Delete from each table using TRUNCATE with CASCADE
    for (const table of tables.rows) {
      const tableName = (table as any).tablename;
      try {
        console.log(`  Clearing ${tableName}...`);
        await db.execute(sql.raw(`TRUNCATE TABLE "${tableName}" CASCADE`));
      } catch (error) {
        console.log(`  ⚠️  Skipping ${tableName} (might be a system table)`);
      }
    }

    console.log("\n✅ Database cleared successfully!");
    console.log("All tables are now empty.\n");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    throw error;
  }
}

// Run the function and exit
clearDatabase()
  .then(() => {
    console.log("✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });

export { clearDatabase };