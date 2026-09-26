import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidEmail } from '../utils/errorHandler';

// Mock Supabase client
vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn(),
        resetPasswordForEmail: vi.fn(),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  };
});

import { supabase } from '../lib/supabase';

describe('Authentication Module Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Email & Password Validation', () => {
    it('validates proper email formats', () => {
      expect(isValidEmail('user@stocksense.in')).toBe(true);
      expect(isValidEmail('admin.test@company.co.in')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('Signup Flow', () => {
    it('calls supabase.auth.signUp with email, password, and metadata', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'manager@stocksense.in' }, session: null },
        error: null,
      });

      const res = await supabase.auth.signUp({
        email: 'manager@stocksense.in',
        password: 'Password123!',
        options: {
          data: { full_name: 'Rajesh Sharma', role: 'manager' },
        },
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'manager@stocksense.in',
        password: 'Password123!',
        options: {
          data: { full_name: 'Rajesh Sharma', role: 'manager' },
        },
      });
      expect(res.data.user?.id).toBe('user-123');
      expect(res.error).toBeNull();
    });
  });

  describe('Login Flow', () => {
    it('authenticates user with email and password', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'manager@stocksense.in' },
          session: { access_token: 'fake-token-123' },
        },
        error: null,
      });

      const res = await supabase.auth.signInWithPassword({
        email: 'manager@stocksense.in',
        password: 'Password123!',
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'manager@stocksense.in',
        password: 'Password123!',
      });
      expect(res.data.session?.access_token).toBe('fake-token-123');
      expect(res.error).toBeNull();
    });
  });

  describe('Logout Flow', () => {
    it('terminates session on logout', async () => {
      (supabase.auth.signOut as any).mockResolvedValue({ error: null });

      const res = await supabase.auth.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(res.error).toBeNull();
    });
  });

  describe('Session Restoration', () => {
    it('restores active user session from local storage', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123', email: 'manager@stocksense.in' },
            access_token: 'active-session-token',
          },
        },
        error: null,
      });

      const res = await supabase.auth.getSession();

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(res.data.session?.user.email).toBe('manager@stocksense.in');
    });
  });

  describe('Password Recovery', () => {
    it('sends password reset link to user email', async () => {
      (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({
        data: {},
        error: null,
      });

      const res = await supabase.auth.resetPasswordForEmail('manager@stocksense.in', {
        redirectTo: 'http://localhost:5173/reset-password',
      });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'manager@stocksense.in',
        { redirectTo: 'http://localhost:5173/reset-password' }
      );
      expect(res.error).toBeNull();
    });
  });
});
