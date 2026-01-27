
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking skills_master table...');
    const { data: skills, error: skillError } = await supabase.from('skills_master').select('count(*)', { count: 'exact', head: true });

    if (skillError) {
        console.error('Error accessing skills_master:', skillError.message);
    } else {
        console.log('skills_master exists.');
    }

    console.log('Checking task_submissions table...');
    const { data: subs, error: subError } = await supabase.from('task_submissions').select('count(*)', { count: 'exact', head: true });

    if (subError) {
        console.error('Error accessing task_submissions:', subError.message);
    } else {
        console.log('task_submissions exists.');
    }
}

check();
