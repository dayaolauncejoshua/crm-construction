import { Router } from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Configure multer for memory storage (we'll upload directly to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// 📤 Upload/Update Profile Picture
router.post(
  "/api/user/profile-picture",
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log("📤 [PROFILE PICTURE] Upload started for user:", userId);
      console.log("  File size:", req.file.size, "bytes");
      console.log("  File type:", req.file.mimetype);

      // Get current user to check for existing profile picture
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Delete old Cloudinary image if it exists (and it's not a Google profile pic)
      if (
        currentUser.profileImageUrl &&
        currentUser.profileImageUrl.includes("cloudinary.com")
      ) {
        try {
          // Extract public_id from Cloudinary URL
          const urlParts = currentUser.profileImageUrl.split("/");
          const publicIdWithExt = urlParts[urlParts.length - 1];
          const publicId = `profile-pictures/${publicIdWithExt.split(".")[0]}`;

          await cloudinary.uploader.destroy(publicId);
          console.log("🗑️ Old Cloudinary image deleted:", publicId);
        } catch (deleteError) {
          console.warn("⚠️ Failed to delete old image:", deleteError);
          // Continue anyway
        }
      }

      // Upload to Cloudinary
      const uploadPromise = new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "profile-pictures",
            transformation: [
              { width: 400, height: 400, crop: "fill", gravity: "face" },
              { quality: "auto" },
              { fetch_format: "auto" },
            ],
            public_id: `user_${userId}_${Date.now()}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(req.file!.buffer);
      });

      const uploadResult = await uploadPromise;

      console.log("✅ Image uploaded to Cloudinary:", uploadResult.secure_url);

      // Update user profile picture in database
      const [updatedUser] = await db
        .update(users)
        .set({
          profileImageUrl: uploadResult.secure_url,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      console.log("✅ Database updated with new profile picture");

      res.json({
        success: true,
        profileImageUrl: updatedUser.profileImageUrl,
        message: "Profile picture updated successfully",
      });
    } catch (error: any) {
      console.error("❌ [PROFILE PICTURE] Upload error:", error);
      res.status(500).json({
        error: "Failed to upload profile picture",
        details: error.message,
      });
    }
  }
);

// 🗑️ Delete Profile Picture
router.delete("/api/user/profile-picture", async (req, res) => {
  try {
    const userId = (req.session as any).userId;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    console.log("🗑️ [PROFILE PICTURE] Delete started for user:", userId);

    // Get current user
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete from Cloudinary if it's a Cloudinary image
    if (
      currentUser.profileImageUrl &&
      currentUser.profileImageUrl.includes("cloudinary.com")
    ) {
      try {
        const urlParts = currentUser.profileImageUrl.split("/");
        const publicIdWithExt = urlParts[urlParts.length - 1];
        const publicId = `profile-pictures/${publicIdWithExt.split(".")[0]}`;

        await cloudinary.uploader.destroy(publicId);
        console.log("✅ Cloudinary image deleted:", publicId);
      } catch (deleteError) {
        console.warn("⚠️ Failed to delete from Cloudinary:", deleteError);
        // Continue anyway
      }
    }

    // Update database to remove profile picture
    const [updatedUser] = await db
      .update(users)
      .set({
        profileImageUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    console.log("✅ Profile picture removed from database");

    res.json({
      success: true,
      message: "Profile picture removed successfully",
    });
  } catch (error: any) {
    console.error("❌ [PROFILE PICTURE] Delete error:", error);
    res.status(500).json({
      error: "Failed to remove profile picture",
      details: error.message,
    });
  }
});

export default router;