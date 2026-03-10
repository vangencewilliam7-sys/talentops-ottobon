
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSDisabled() {
    console.log('Verifying if RLS is effectively disabled...');

    // Attempt insert into notifications
    const { data: notif, error: notifError } = await supabase
        .from('notifications')
        .insert({
            message: 'Verification Test',
            type: 'test',
            receiver_id: '00000000-0000-0000-0000-000000000000',
            is_read: false
        })
        .select();

    if (notifError) {
        console.log('Notification Insert STILL Fails:', notifError.message);
    } else {
        console.log('Notification Insert Succeeded! RLS is off.');
        // Cleanup
        await supabase.from('notifications').delete().eq('id', notif[0].id);
    }

    // Attempt upsert into conversation_indexes
    const { error: indexError } = await supabase
        .from('conversation_indexes')
        .upsert({
            conversation_id: '00000000-0000-0000-0000-000000000000',
            last_message: 'test_rls_off',
            last_message_at: new Date().toISOString()
        });

    if (indexError) {
        console.log('Index Upsert STILL Fails:', indexError.message);
    } else {
        console.log('Index Upsert Succeeded! RLS is off.');
    }
}

checkRLSDisabled();
