import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Fetching aggregation of review months and years...");
    const { data, error } = await supabase.from('employee_reviews').select('review_month, review_year, id');
    if (error) {
        console.error("Error:", error);
    } else {
        const counts = {};
        data.forEach(r => {
            const key = `${r.review_month}-${r.review_year}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        console.log("Review Counts by Month-Year:");
        console.log(counts);
    }
}

check();
