import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

export interface UpdateProfileInput {
  full_name: string;
}

/**
 * Update application-specific profile data (full_name) in Supabase `profiles` table
 */
export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<Profile> {
  if (!userId) {
    throw new Error('User ID is required for profile update.');
  }

  const trimmedName = input.full_name?.trim();
  if (!trimmedName) {
    throw new Error('Full Name cannot be empty.');
  }

  // Update profiles table respecting RLS
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: trimmedName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update profile info.');
  }

  // Optionally sync Supabase Auth user metadata
  await supabase.auth.updateUser({
    data: {
      full_name: trimmedName,
    },
  });

  return data as Profile;
}

/**
 * Atomically change user password via Supabase Auth
 * 1. Validate current password by re-authenticating with signInWithPassword
 * 2. Update to new password via updateUser({ password })
 */
export async function changeUserPassword(
  email: string,
  currentPass: string,
  newPass: string,
  confirmPass: string
): Promise<void> {
  if (!email) {
    throw new Error('Account email is missing.');
  }
  if (!currentPass) {
    throw new Error('Please enter your current password.');
  }
  if (!newPass) {
    throw new Error('Please enter your new password.');
  }
  if (newPass.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }
  if (newPass !== confirmPass) {
    throw new Error('New password and confirm password do not match.');
  }
  if (currentPass === newPass) {
    throw new Error('New password must be different from current password.');
  }

  // Step 1: Re-authenticate with current password to ensure verification
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email,
    password: currentPass,
  });

  if (verifyErr) {
    throw new Error('Invalid current password. Please check and try again.');
  }

  // Step 2: Perform password update on Supabase Auth session
  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPass,
  });

  if (updateErr) {
    throw new Error(updateErr.message || 'Failed to update password via Supabase Auth.');
  }
}
