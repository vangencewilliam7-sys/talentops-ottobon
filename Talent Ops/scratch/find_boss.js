import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findBoss() {
    console.log('Searching for any Executive in the database...');
    
    const { data: executives, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'executive');
        
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`--- EXECUTIVES FOUND: ${executives.length} ---`);
    console.log(JSON.stringify(executives, null, 2));
}

findBoss();
