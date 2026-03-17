
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrigger() {
    console.log('Checking for triggers on messages table...');
    const { data, error } = await supabase.rpc('get_table_triggers', { table_name_input: 'messages' });

    if (error) {
        // Fallback for discovery
        console.log('RPC get_table_triggers not found. Trying to see if we can infer from a test message...');

        // Let's check the functions directly if possible (unlikely via anon key but worth a shot)
        const { data: functions, error: funcError } = await supabase
            .from('pg_proc')
            .select('proname')
            .ilike('proname', '%notification%');

        if (funcError) {
            console.log('Could not check functions:', funcError.message);
        } else {
            console.log('Found functions matching "notification":');
            console.table(functions);
        }
    } else {
        console.table(data);
    }
}

checkTrigger();
