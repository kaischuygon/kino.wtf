import { useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type OAuthProvider = 'discord' | 'google' | 'github';

function getAuthRedirectUrl(path = '/auth'): string {
  const configuredRedirect = import.meta.env.VITE_AUTH_REDIRECT_URL;

  if (typeof configuredRedirect === 'string' && configuredRedirect.trim().length > 0) {
    try {
      return new URL(path, configuredRedirect).toString();
    } catch {
      // Ignore invalid env values and fall back to runtime origin.
    }
  }

  return `${window.location.origin}${path}`;
}

export default function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const user: User | null = useMemo(() => session?.user ?? null, [session]);

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');

    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithEmail = async (email: string, password: string, username?: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');

    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl('/auth/confirmed'),
        data: username ? { username } : undefined,
      },
    });
  };

  const signInWithOAuth = async (provider: OAuthProvider) => {
    if (!supabase) throw new Error('Supabase is not configured.');

    const queryParams = provider === 'discord' ? { scope: 'identify email' } : undefined;

    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getAuthRedirectUrl('/auth'),
        queryParams,
      },
    });
  };

  const requestPasswordReset = async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');

    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl('/auth?mode=reset'),
    });
  };

  const updatePassword = async (password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');

    return supabase.auth.updateUser({ password });
  };

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase is not configured.');

    return supabase.auth.signOut();
  };

  return {
    isConfigured: isSupabaseConfigured,
    loading,
    session,
    user,
    signInWithEmail,
    signUpWithEmail,
    signInWithOAuth,
    requestPasswordReset,
    updatePassword,
    signOut,
  };
}
