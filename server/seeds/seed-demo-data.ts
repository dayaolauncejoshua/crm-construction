import { db } from "../db";
import { users } from "@shared/schema";
import bcrypt from "bcrypt";

async function seedDemoData() {
  try {
    console.log("🌱 Starting database seeding...\n");

    // Hash the password
    const password = "ljd020802"; // ← Known password for super admin
    const passwordHash = await bcrypt.hash(password, 10);

    // Create ONLY Super Admin
    console.log("👤 Creating super admin...");
    const [superAdmin] = await db
      .insert(users)
      .values({
        id: "super-admin-1",
        email: "admin@aileadsystem.com",
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
        passwordHash: passwordHash, // ← Real password hash
        isActive: true,
      })
      .returning();

    console.log("✅ Super admin created:");
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Password: ${password}`); // ← Show the password
    console.log(`   Name: ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log(`   Role: ${superAdmin.role}`);
    console.log(`   ID: ${superAdmin.id}\n`);

    console.log("🔐 LOGIN CREDENTIALS:");
    console.log("┌─────────────────────────────────────────┐");
    console.log("│ Email:    admin@aileadsystem.com        │");
    console.log("│ Password: ljd020802                     │");
    console.log("└─────────────────────────────────────────┘\n");

    console.log("✅ Database seeded successfully!\n");
    
    console.log("🎯 What was created:");
    console.log(`   • 1 Super Admin (${superAdmin.email})`);
    console.log(`   • 0 Users (create via Users Management page)`);
    console.log(`   • 0 Clients (users will create their own)`);
    console.log(`   • 0 Leads (will come from landing page)\n`);

    console.log("📊 ARCHITECTURE:");
    console.log("┌─────────────────────────────────────────┐");
    console.log("│ Super Admin (YOU)                       │");
    console.log("│ └─ Creates Users via UI                 │");
    console.log("├─────────────────────────────────────────┤");
    console.log("│ Users (Business Owners)                 │");
    console.log("│ └─ Create their own Clients via UI      │");
    console.log("├─────────────────────────────────────────┤");
    console.log("│ Clients (Businesses)                    │");
    console.log("│ └─ Receive Leads from landing page      │");
    console.log("└─────────────────────────────────────────┘\n");

    console.log("🚀 Next Steps:");
    console.log("   1. Start server: npm run dev");
    console.log("   2. Go to: http://localhost:5000/login");
    console.log("   3. Login with:");
    console.log("      Email: admin@aileadsystem.com");
    console.log("      Password: admin123");
    console.log("   4. Go to: Super Admin > Users Management");
    console.log("   5. Create users for your customers\n");

    return { superAdmin, password };
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the function and exit
seedDemoData()
  .then(() => {
    console.log("✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });

export { seedDemoData };