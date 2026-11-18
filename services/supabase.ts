
import { createClient } from '@supabase/supabase-js';

// Helper to retrieve Supabase configuration safely from environment or local storage
export const getSupabaseConfig = () => {
  let url = '';
  let key = '';

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      url = localStorage.getItem('cbt_supabase_url') || '';
      key = localStorage.getItem('cbt_supabase_key') || '';
    }
  } catch (e) {
    // localStorage not accessible
  }

  if (!url) {
    url = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || 
          (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
          (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || '';
  }
  if (!key) {
    key = (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY)) || 
          (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_KEY)) || '';
  }

  // Prevent connecting to the defunct/unresolvable test domain to avoid DNS errors
  if (url.includes('adreqfeforuibewzctku.supabase.co')) {
    url = '';
    key = '';
  }

  return { url: url.trim(), key: key.trim() };
};

let supabase: any = null;

const { url: initialUrl, key: initialKey } = getSupabaseConfig();

if (initialUrl && initialKey && initialUrl.startsWith('http')) {
  try {
    supabase = createClient(initialUrl, initialKey);
    console.info("✅ Supabase Client terhubung ke:", initialUrl);
  } catch (error) {
    console.warn("⚠️ Gagal inisialisasi Supabase client:", error);
    supabase = null;
  }
} else {
  console.info("ℹ️ Mode Lokal Aktif (Supabase Cloud opsional). Semua data tersimpan aman di browser.");
}

export const setSupabaseCredentials = (url: string, key: string) => {
  const cleanUrl = url.trim();
  const cleanKey = key.trim();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (!cleanUrl || !cleanKey) {
        localStorage.removeItem('cbt_supabase_url');
        localStorage.removeItem('cbt_supabase_key');
        supabase = null;
        return { success: true, mode: 'local' };
      }
      localStorage.setItem('cbt_supabase_url', cleanUrl);
      localStorage.setItem('cbt_supabase_key', cleanKey);
      supabase = createClient(cleanUrl, cleanKey);
      return { success: true, mode: 'cloud' };
    }
  } catch (err: any) {
    console.warn("Gagal memperbarui konfigurasi Supabase:", err);
    return { success: false, error: err?.message || 'Gagal' };
  }
  return { success: false, error: 'Window tidak tersedia' };
};

export { supabase };

