
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIndex() {
    console.log('Checking conversation_indexes...');
    const { data, error } = await supabase
        .from('conversation_indexes')
        .select('*')
        .limit(5);

    if (error) {
        console.log('Error fetching index:', error.message);
    } else {
        console.log('Index rows:', data.length);
    }

    // Test update
    const { error: upsertError } = await supabase
        .from('conversation_indexes')
        .upsert({ conversation_id: '00000000-0000-0000-0000-000000000000', last_message: 'test' });

    if (upsertError) {
        console.log('Upsert Failed:', upsertError.message);
    } else {
        console.log('Upsert Succeeded!');
    }
}

checkIndex();
