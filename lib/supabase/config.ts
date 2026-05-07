const fallbackSupabaseUrl = "https://example.supabase.co";
const fallbackSupabasePublishableKey = "supabase-build-placeholder-key";

export function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackSupabaseUrl,
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || fallbackSupabasePublishableKey,
  };
}
