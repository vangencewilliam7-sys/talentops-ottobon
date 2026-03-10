import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addConstraint() {
    console.log("Adding unique constraint...");
    const query = `
        ALTER TABLE public.employee_reviews
        ADD CONSTRAINT unique_user_month_year UNIQUE (user_id, review_month, review_year);
    `;

    // There may be existing duplicates if users were able to insert.
    // Let's first delete duplicates just in case there are any
    const cleanupQuery = `
        DELETE FROM public.employee_reviews
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY user_id, review_month, review_year 
                    ORDER BY created_at DESC
                ) as row_num
                FROM public.employee_reviews
            ) t
            WHERE t.row_num > 1
        );
    `;

    await supabase.rpc('execute_sql_chatbot', { query: cleanupQuery });

    const { data, error } = await supabase.rpc('execute_sql_chatbot', { query: query });
    if (error) {
        console.error("Error executing SQL:", error);
    } else {
        console.log("Constraint added successfully via RPC.");
    }
}

addConstraint();
