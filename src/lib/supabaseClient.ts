import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey,
);

export const supabaseConfigurationMessage =
  "Supabase URL과 publishable key 환경변수를 설정해 주세요.";

function createUnavailableSupabaseClient() {
  return new Proxy({} as SupabaseClient<Database>, {
    get() {
      throw new Error(supabaseConfigurationMessage);
    },
  });
}

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabasePublishableKey)
  : createUnavailableSupabaseClient();
