/**
 * API Layer — ใช้ Supabase เป็นหลังบ้านเท่านั้น (Deploy กับ Vercel)
 */
import { supabaseAPI } from './supabaseAPI';

export const gasAPI = supabaseAPI;
