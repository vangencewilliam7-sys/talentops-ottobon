import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Fetching reviews...");
    const { data, error } = await supabase.from('employee_reviews').select('id, user_id, review_month, review_year, is_locked').limit(20);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Reviews:", data);
        const nullMonths = data.filter(r => r.review_month === null);
        console.log(`Found ${nullMonths.length} reviews with NULL review_month out of ${data.length}`);
    }
}

check();
