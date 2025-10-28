import { User as SchemaUser } from "@shared/schema";

declare global {
  namespace Express {
    // ✅ Extend Passport's User with our schema User type
    interface User extends SchemaUser {}
  }
}

export {};