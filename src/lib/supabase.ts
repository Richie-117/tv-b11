import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;
let cachedAnonClient: SupabaseClient | null = null;
let isSupabaseHealthy = true;
let lastFailureTimestamp = 0;
const FAILURE_COOLDOWN_MS = 60_000;

export function markSupabaseUnhealthy(): void {
  isSupabaseHealthy = false;
  lastFailureTimestamp = Date.now();
  console.warn('[Supabase Circuit Breaker] Supabase remote is unreachable or timed out. Tripped circuit breaker: using local database with 0ms latency.');
}

export function isSupabaseAvailable(): boolean {
  if (!isSupabaseConfigured()) return false;
  if (!isSupabaseHealthy) {
    if (Date.now() - lastFailureTimestamp > FAILURE_COOLDOWN_MS) {
      isSupabaseHealthy = true; // Retry after cooldown
      return true;
    }
    return false;
  }
  return true;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes('your-project-ref') &&
    !url.includes('placeholder') &&
    url.startsWith('https://')
  );
}

/**
 * Server-only privileged Supabase client using Service Role key.
 * Never expose this client to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseAvailable()) {
    return null;
  }

  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!;
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

  cachedAdminClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: async (input, init) => {
        try {
          return await fetch(input, {
            ...init,
            cache: 'no-store',
            signal: AbortSignal.timeout(1500),
          });
        } catch (err) {
          markSupabaseUnhealthy();
          throw err;
        }
      },
    },
  });

  return cachedAdminClient;
}

/**
 * Browser-safe Supabase client using Anon key.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseAvailable()) {
    return null;
  }

  if (cachedAnonClient) {
    return cachedAnonClient;
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!;
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)!;

  cachedAnonClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return cachedAnonClient;
}
