// server/services/cloudinary.service.ts
import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryService {
  /**
   * Upload video to Cloudinary
   * @param filePath - Local path to the video file
   * @param publicId - Optional custom public ID for the video
   * @returns Object with video URL and public ID
   */
  async uploadVideo(
    filePath: string,
    publicId?: string
  ): Promise<{
    url: string;
    secureUrl: string;
    publicId: string;
    duration: number;
  }> {
    try {
      console.log("☁️ Uploading video to Cloudinary:", filePath);

      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: "video",
        public_id: publicId,
        folder: "vsl-videos", // Organize videos in a folder
        eager: [
          { streaming_profile: "hd", format: "m3u8" }, // HLS streaming
        ],
        eager_async: true,
        overwrite: true,
      });

      console.log("✅ Video uploaded successfully:", result.secure_url);

      return {
        url: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        duration: result.duration || 0,
      };
    } catch (error) {
      console.error("❌ Cloudinary video upload failed:", error);
      throw new Error(
        `Failed to upload video to Cloudinary: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Upload image/thumbnail to Cloudinary
   * @param filePath - Local path to the image file
   * @param publicId - Optional custom public ID for the image
   * @returns Object with image URL and public ID
   */
  async uploadImage(
    filePath: string,
    publicId?: string
  ): Promise<{ url: string; secureUrl: string; publicId: string }> {
    try {
      console.log("🖼️ Uploading thumbnail to Cloudinary:", filePath);

      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: "image",
        public_id: publicId,
        folder: "vsl-thumbnails", // Organize thumbnails in a folder
        transformation: [
          { width: 1280, height: 720, crop: "fill" }, // Optimize thumbnail
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
        overwrite: true,
      });

      console.log("✅ Thumbnail uploaded successfully:", result.secure_url);

      return {
        url: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      console.error("❌ Cloudinary image upload failed:", error);
      throw new Error(
        `Failed to upload image to Cloudinary: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete a resource from Cloudinary
   * @param publicId - The public ID of the resource to delete
   * @param resourceType - Type of resource ('video' or 'image')
   */
  async deleteResource(
    publicId: string,
    resourceType: "video" | "image" = "video"
  ): Promise<void> {
    try {
      console.log(`🗑️ Deleting ${resourceType} from Cloudinary:`, publicId);

      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      console.log(`✅ ${resourceType} deleted successfully:`, publicId);
    } catch (error) {
      console.error(`❌ Failed to delete ${resourceType}:`, error);
      throw new Error(
        `Failed to delete ${resourceType} from Cloudinary: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get video info from Cloudinary
   * @param publicId - The public ID of the video
   */
  async getVideoInfo(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: "video",
      });
      return result;
    } catch (error) {
      console.error("❌ Failed to get video info:", error);
      throw error;
    }
  }
}

export const cloudinaryService = new CloudinaryService();
