import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkUser() {
    const email = 'tutorsupabase@gmail.com';
    console.log(`Checking profiles for: ${email}`);
    
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);
        
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log('--- PROFILES FOUND ---');
    console.log(JSON.stringify(profiles, null, 2));
}

checkUser();
