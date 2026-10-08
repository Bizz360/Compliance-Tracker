import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'customsflow_supabase_url';
const STORAGE_KEY_KEY = 'customsflow_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let currentConfiguredUrl = '';
let currentConfiguredKey = '';

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  const localUrl = localStorage.getItem(STORAGE_KEY_URL) || '';
  const localKey = localStorage.getItem(STORAGE_KEY_KEY) || '';

  return {
    url: localUrl || envUrl,
    anonKey: localKey || envKey,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  cachedClient = null;
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  cachedClient = null;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getStoredSupabaseConfig();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();

  if (!url || !anonKey || !url.startsWith('http')) {
    return null;
  }

  if (cachedClient && currentConfiguredUrl === url && currentConfiguredKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    currentConfiguredUrl = url;
    currentConfiguredKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string; tableCount?: number }> {
  try {
    const testClient = createClient(url, anonKey);
    // Attempt a light ping on profiles or master_data
    const { count, error } = await testClient
      .from('master_data')
      .select('*', { count: 'exact', head: true });

    if (error) {
      // Table might not exist yet if migrations haven't run
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Connected to Supabase project! (Tables not yet created, run migration script)',
          tableCount: 0,
        };
      }
      return {
        success: false,
        message: `Connection error: ${error.message} (${error.code || 'unknown'})`,
      };
    }

    return {
      success: true,
      message: 'Supabase connection verified successfully! Schema tables detected.',
      tableCount: count ?? 0,
    };
  } catch (err) {
    return {
      success: false,
      message: `Failed to connect: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
