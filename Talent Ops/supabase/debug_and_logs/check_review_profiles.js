import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking profiles vs reviews...");
    const { data: reviews } = await supabase.from('employee_reviews').select('*').eq('review_month', 1);
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, org_id');

    console.log(`Reviews match found for:`);
    reviews.forEach(r => {
        const p = profiles.find(pr => pr.id === r.user_id);
        console.log(`- ${r.user_id}: ${p ? p.full_name : 'No profile found'} (Org: ${p ? p.org_id : 'N/A'})`);
    });
}

check();
