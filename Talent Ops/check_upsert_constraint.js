import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Attempting a dummy upsert to test constraint existence...");

    // Attempt an upsert with onConflict clause to see if it errors out because the constraint doesn't exist
    const { data: user } = await supabase.from('profiles').select('id').limit(1).single();
    if (!user) {
        console.log("No user found");
        return;
    }

    const { data, error } = await supabase
        .from('employee_reviews')
        .upsert({
            user_id: user.id,
            review_month: 2,
            review_year: 2026,
            development_skills: {}
        }, { onConflict: 'unique_user_month_year' })
        .select();

    if (error) {
        console.error("Upsert Failed! Error:", error);
    } else {
        console.log("Upsert Succeeded:", data);
        // Clean up
        await supabase.from('employee_reviews').delete().eq('id', data[0].id);
    }
}

check();
