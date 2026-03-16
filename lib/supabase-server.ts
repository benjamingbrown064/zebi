import { getServerSupabaseClient } from './supabase';

export function createClient() {
  return getServerSupabaseClient();
}
