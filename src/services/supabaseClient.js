/**
 * Supabase Client
 * ใช้สำหรับเชื่อมต่อกับ Supabase (หลังบ้านใหม่)
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://arilermjxqvmkvmzzzpz.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_NCO4m-OlWALUKbqnMTh3nA_i00koSN0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
