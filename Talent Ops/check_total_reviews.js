import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { count, error } = await supabase.from('employee_reviews').select('*', { count: 'exact', head: true });
    console.log(`Total reviews in table: ${count}`);

    const { data: nullMonths } = await supabase.from('employee_reviews').select('id, created_at').is('review_month', null);
    console.log(`Reviews with null month: ${nullMonths ? nullMonths.length : 0}`);
}

check();
