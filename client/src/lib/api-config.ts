// client/src/lib/api-config.ts

// Get the API URL from environment variable
// In development: defaults to relative paths (localhost proxy)
// In production: uses the full Render backend URL
export const API_URL = import.meta.env.VITE_API_URL || '';

// Helper to build full API URLs
export function getApiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // If API_URL is empty (development), return relative path
  if (!API_URL) {
    return `/${cleanPath}`;
  }
  
  // Production: use full URL
  return `${API_URL}/${cleanPath}`;
}