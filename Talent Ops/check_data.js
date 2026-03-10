
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActualData() {
    console.log('Checking for actual recent notifications...');
    const { data: notifs, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (notifError) {
        console.error('Error fetching notifications:', notifError.message);
    } else {
        console.log('Recent Notifications found in DB:', notifs.length);
        notifs.forEach(n => console.log(`- [${n.type}] ${n.message}`));
    }

    console.log('\nChecking for unread messages in conversation_indexes...');
    const { data: indexes, error: indexError } = await supabase
        .from('conversation_indexes')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(10);

    if (indexError) {
        console.error('Error fetching indexes:', indexError.message);
    } else {
        console.log('Recent Conversation Updates found in DB:', indexes.length);
        indexes.forEach(i => console.log(`- [${i.last_message_at}] ${i.last_message}`));
    }
}

checkActualData();
