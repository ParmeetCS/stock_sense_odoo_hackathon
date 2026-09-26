import { supabase } from '../lib/supabase';
import type { SystemHealth } from '../types';

export async function checkSystemHealth(): Promise<SystemHealth> {
  const timestamp = new Date().toISOString();
  try {
    const { error } = await supabase.from('health_check').select('*').limit(1);
    const databaseConnected = Boolean(
      !error || error.code === 'PGRST116' || (error.message && error.message.includes('relation'))
    );
    return {
      status: databaseConnected ? 'healthy' : 'degraded',
      version: '1.0.0',
      databaseConnected,
      timestamp,
    };
  } catch (err) {
    console.error('System health check error:', err);
    return {
      status: 'degraded',
      version: '1.0.0',
      databaseConnected: false,
      timestamp,
    };
  }
}
