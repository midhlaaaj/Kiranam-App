import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
}

// Expo Router also renders routes under plain Node (SSR / static export),
// where `window` doesn't exist at all — guard so importing this client there
// doesn't crash trying to read AsyncStorage's web (localStorage) backend.
const isServer = typeof window === 'undefined';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isServer ? undefined : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
  realtime: {
    // This app doesn't use Realtime subscriptions; avoid eagerly requiring a
    // native WebSocket implementation that plain Node lacks during SSR.
    transport: (typeof WebSocket !== 'undefined' ? WebSocket : (class {} as unknown)) as any,
  },
});
