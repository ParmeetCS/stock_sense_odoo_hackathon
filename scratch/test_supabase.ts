import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xzqzzyyutvgjdyskweeo.supabase.co';
const supabaseAnonKey = 'sb_publishable_zLEBYrCjN5TNfuF1M59N3Q_JG3hEYbY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing Supabase query...');
  const { data: transfers, error: tErr } = await supabase.from('internal_transfers').select('*');
  console.log('Transfers count:', transfers?.length, 'Error:', tErr);

  const { data: items, error: iErr } = await supabase.from('internal_transfer_items').select('*');
  console.log('Transfer items count:', items?.length, 'Error:', iErr);
  
  const { data: rpcTest, error: rpcErr } = await supabase.rpc('complete_transfer', { p_transfer_id: '00000000-0000-0000-0000-000000000000' });
  console.log('RPC complete_transfer test error:', rpcErr?.message);
}

test();
