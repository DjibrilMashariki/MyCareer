import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️  Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.\n" +
    "   The app will run in demo mode with in-memory storage.\n" +
    "   Set these in your .env file for production use."
  );
}

// Public client — respects Row-Level Security (RLS)
// Use this for operations that should be scoped to the authenticated user
export const supabase = createClient(
  supabaseUrl || "http://localhost:54321",
  supabaseAnonKey || "placeholder-key"
);

// Service role client — bypasses RLS
// Use this for admin operations (e.g., creating users, server-side batch operations)
export const supabaseAdmin = createClient(
  supabaseUrl || "http://localhost:54321",
  supabaseServiceRoleKey || supabaseAnonKey || "placeholder-key",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return !!(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "https://your-project-id.supabase.co"
  );
}
