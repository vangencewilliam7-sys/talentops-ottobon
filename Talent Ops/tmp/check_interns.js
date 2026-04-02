import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/Talentops 2.0/talentops-ottobon/Talent Ops/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkInterns() {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, employment_type')
    .eq('employment_type', 'intern');
  
  if (error) {
    console.error('Error fetching interns:', error);
    process.exit(1);
  }
  
  console.log('Interns found:', data);
  process.exit(0);
}

checkInterns();
