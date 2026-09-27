import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("Supabase config:", {
  hasUrl: Boolean(supabaseUrl),
  urlLength: supabaseUrl?.length,
  urlPrefix: supabaseUrl?.slice(0, 10),
  hasKey: Boolean(supabasePublishableKey),
});

if (!supabaseUrl) {
  throw new Error("Missing VITE_SUPABASE_URL");
}

if (!supabasePublishableKey) {
  throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY");
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);
