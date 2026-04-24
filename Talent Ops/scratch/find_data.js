import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findData() {
    console.log('Searching for data across common tables...');
    
    const tables = ['onboarding_requests', 'onboarding', 'requests', 'tenants', 'orgs'];
    
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table "${table}": Error or Not Found`);
        } else {
            const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
            console.log(`Table "${table}": FOUND (${count} records)`);
        }
    }
}

findData();
