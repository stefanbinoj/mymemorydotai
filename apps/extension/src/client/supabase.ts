import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.WXT_APP_SUPABASE_ANON_KEY,
  import.meta.env.WXT_APP_SUPABASE_ANON_KEY
);
