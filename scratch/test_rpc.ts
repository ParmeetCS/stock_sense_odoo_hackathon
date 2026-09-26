import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xzqzzyyutvgjdyskweeo.supabase.co';
const supabaseAnonKey = 'sb_publishable_zLEBYrCjN5TNfuF1M59N3Q_JG3hEYbY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data: rpcTest, error: rpcErr } = await supabase.rpc('complete_receipt', { p_receipt_id: '00000000-0000-0000-0000-000000000000' });
  console.log('RPC complete_receipt response:', { rpcTest, error: rpcErr?.message });
}

test();
