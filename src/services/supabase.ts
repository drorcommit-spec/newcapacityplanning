import { createClient } from '@supabase/supabase-js';

// Check if we should use Supabase (production) or JSON file (local)
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client (only if configured)
export const supabase = USE_SUPABASE && SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Check if Supabase is enabled
export const isSupabaseEnabled = () => USE_SUPABASE && supabase !== null;

// Determine environment based on URL
const isDev = SUPABASE_URL.includes('nkonqfrhikxrxhorsosk'); // Dev project ID
const envLabel = isDev ? 'Development' : 'Production';

console.log('🔧 Database Mode:', isSupabaseEnabled() ? `Supabase (${envLabel})` : 'JSON File (Local)');
console.log('🔗 Supabase URL:', SUPABASE_URL || 'Not configured');
