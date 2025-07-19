import { createClient } from "@supabase/supabase-js";

export const supabaseClient = createClient(
  import.meta.env.WXT_APP_SUPABASE_URL,
  import.meta.env.WXT_APP_SUPABASE_ANON_KEY
);
