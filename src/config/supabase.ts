import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required Supabase environment variables');
}

// Create a single supabase client for the entire app
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;