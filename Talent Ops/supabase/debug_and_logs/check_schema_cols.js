
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCols() {
    const { data: tasksCols } = await supabase.rpc('get_table_schema', { table_name_param: 'tasks' });
    const { data: stepsCols } = await supabase.rpc('get_table_schema', { table_name_param: 'task_steps' });

    fs.writeFileSync('schema_info.json', JSON.stringify({ tasks: tasksCols, task_steps: stepsCols }, null, 2));
}

checkCols();
