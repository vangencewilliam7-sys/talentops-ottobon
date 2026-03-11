
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMultiTenancy() {
    console.log('--- Multi-Tenancy Verification Report ---');

    // 1. Check if 'orgs' has the new columns
    const { data: orgCols, error: orgError } = await supabase.from('orgs').select('*').limit(1);
    if (orgError) {
        console.error('❌ Error reading orgs table:', orgError.message);
    } else {
        const keys = orgCols.length > 0 ? Object.keys(orgCols[0]) : [];
        console.log('✅ Orgs table readable.');
        if (keys.includes('enabled_modules')) console.log('   - enabled_modules: FOUND');
        if (keys.includes('slug')) console.log('   - slug: FOUND');
    }

    // 2. Check if 'profiles' has jwt_version and org_id
    const { data: profCols, error: profError } = await supabase.from('profiles').select('*').limit(1);
    if (profError) {
        console.error('❌ Error reading profiles table:', profError.message);
    } else {
        const keys = profCols.length > 0 ? Object.keys(profCols[0]) : [];
        if (keys.includes('jwt_version')) console.log('✅ Profiles: jwt_version column FOUND');
        if (keys.includes('org_id')) console.log('✅ Profiles: org_id column FOUND');
    }

    // 3. Check if 'audit_logs' table exists
    const { error: auditError } = await supabase.from('audit_logs').select('*').limit(1);
    if (auditError) {
        console.error('❌ Audit Logs table missing or unreadable:', auditError.message);
    } else {
        console.log('✅ Audit Logs system: ACTIVE');
    }

    console.log('\n--- Final Lockdown Status ---');
    console.log('If the above columns are FOUND, Phase 1-4 are technically complete.');
    console.log('Next: Deploy Edge Function and start Super Admin UI.');
}

verifyMultiTenancy();
