import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Fetching all reviews...");
    const { data: reviews } = await supabase.from('employee_reviews').select('*');

    let countEmptySelf = 0;
    let countEmptyManager = 0;

    reviews.forEach(r => {
        const hasSelf = r.development_skills && Object.keys(r.development_skills).length > 0;
        const hasManager = r.manager_development_skills && Object.keys(r.manager_development_skills).length > 0;

        if (!hasSelf) countEmptySelf++;
        if (!hasManager) countEmptyManager++;

        console.log(`User ${r.user_id}: Month=${r.review_month}, Self=${hasSelf}, Manager=${hasManager}, TotalScore=${r.manager_score_total}`);
    });

    console.log(`\nSummary: ${reviews.length} reviews. ${countEmptySelf} empty self reviews. ${countEmptyManager} empty manager reviews.`);
}

check();
