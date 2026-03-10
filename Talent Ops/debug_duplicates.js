
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .ilike('message', '%hiiiiiii%')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${data.length} notifications for messages containing "hiiiiiii".`);
    data.forEach(n => {
        console.log(`ID: ${n.id} | Created: ${n.created_at} | Receiver: ${n.receiver_id} | Sender: ${n.sender_name} | Msg: ${n.message}`);
    });
}
check();
