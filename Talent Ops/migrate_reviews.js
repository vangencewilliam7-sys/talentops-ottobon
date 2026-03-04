import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    const query = `
        ALTER TABLE employee_reviews ADD COLUMN IF NOT EXISTS review_month integer;
        ALTER TABLE employee_reviews ADD COLUMN IF NOT EXISTS review_year integer;
        ALTER TABLE employee_reviews ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

        -- We need to drop the existing unique constraint on user_id to allow multiple months.
        DO $$ 
        DECLARE 
        constraint_name text; 
        BEGIN
        -- Identify the unique constraint on user_id
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'employee_reviews' AND att.attname = 'user_id' AND con.contype = 'u';

        IF constraint_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE employee_reviews DROP CONSTRAINT IF EXISTS ' || constraint_name;
        END IF;
        
        -- Create the new unique constraint for monthly records
        BEGIN
            ALTER TABLE employee_reviews ADD CONSTRAINT unique_user_month_year UNIQUE (user_id, review_month, review_year);
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Constraint might already exist, skipping: %', SQLERRM;
        END;

        -- Update any existing reviews that don't have a month/year
        UPDATE employee_reviews 
        SET review_month = EXTRACT(MONTH FROM created_at)::integer,
            review_year = EXTRACT(YEAR FROM created_at)::integer
        WHERE review_month IS NULL;
        END $$;
    `;
    const { data: rows, error: e2 } = await supabase.rpc('execute_sql', { query });
    if (e2) {
        console.log("fallback to execute_sql_chatbot", e2.message);
        const { error: e3 } = await supabase.rpc('execute_sql_chatbot', { query });
        if (e3) {
            console.log("Error again:", e3);
        } else {
            console.log("Success with execute_sql_chatbot");
        }
    } else {
        console.log("Success with execute_sql");
    }
}
runMigration();
