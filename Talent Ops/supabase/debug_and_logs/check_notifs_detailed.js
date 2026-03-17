
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestNotifs() {
    console.log('--- LATEST NOTIFICATIONS (Last 5 mins) ---');
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (data.length === 0) {
        console.log('No notifications found in the last 5 minutes.');
    } else {
        data.forEach(n => {
            console.log(`[${n.created_at}] To: ${n.receiver_id} | From: ${n.sender_name} | Msg: ${n.message}`);
        });
    }

    const { data: { user } } = await supabase.auth.getUser();
    console.log('\n--- CURRENT AUTH USER ---');
    console.log(user ? user.id : 'No user logged in (in this script context)');
}

checkLatestNotifs();
