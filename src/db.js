import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

console.log("[DB] URL:", url ? "Loaded" : "Missing");
console.log("[DB] KEY:", key ? "Loaded" : "Missing");

export const supabase = createClient(url, key);
