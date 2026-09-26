import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  ShieldCheck,
  LogOut,
  Calendar,
  Key,
  Edit2,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  Fingerprint,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { updateUserProfile, changeUserPassword } from '../services/profileService';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, fetchProfile } = useAuth();
  const { showToast } = useToast();

  // Edit Profile State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(profile?.full_name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await signOut();
      showToast('Signed Out', 'Your session has been terminated.', 'info');
      navigate('/login');
    } catch (err: any) {
      showToast('Logout Error', err.message || 'Failed to sign out', 'error');
    }
  };

  const handleOpenEditModal = () => {
    setEditFullName(profile?.full_name || user?.user_metadata?.full_name || '');
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!editFullName.trim()) {
      showToast('Validation Error', 'Full name cannot be empty.', 'error');
      return;
    }

    try {
      setSavingProfile(true);
      await updateUserProfile(user.id, { full_name: editFullName });
      await fetchProfile(user.id);
      showToast('Profile Updated', 'Your profile details have been updated.', 'success');
      setIsEditModalOpen(false);
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      await changeUserPassword(user?.email || '', currentPassword, newPassword, confirmPassword);
      showToast('Password Changed', 'Your account password has been updated securely.', 'success');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-semibold inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> System Administrator
          </span>
        );
      case 'manager':
        return (
          <span className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-semibold inline-flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Inventory Manager
          </span>
        );
      case 'audit_viewer':
        return (
          <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold inline-flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-400" /> Audit Viewer
          </span>
        );
      case 'inventory_user':
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Warehouse Staff
          </span>
        );
    }
  };

  const formattedCreatedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Account Profile & Security"
        description="View personal credentials, manage account information, and update authentication password"
        actions={
          <Button
            variant="danger"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        }
      />

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Overview Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 text-center space-y-4 shadow-xl">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 border-2 border-blue-400/40 flex items-center justify-center text-white font-extrabold text-3xl shadow-lg mx-auto uppercase">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900" title="Account Active" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">
                {profile?.full_name || 'StockSense User'}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</p>
            </div>

            <div className="pt-2">{getRoleBadge(profile?.role)}</div>

            <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEditModal}
                className="w-full border-slate-800 text-slate-300 hover:bg-slate-800 text-xs py-2"
              >
                <Edit2 className="w-3.5 h-3.5 mr-2 text-blue-400" /> Edit Profile
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPasswordError(null);
                  setIsPasswordModalOpen(true);
                }}
                className="w-full border-slate-800 text-slate-300 hover:bg-slate-800 text-xs py-2"
              >
                <Key className="w-3.5 h-3.5 mr-2 text-amber-400" /> Change Password
              </Button>
            </div>
          </div>

          {/* Security Status Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg text-xs">
            <div className="flex items-center gap-2 text-slate-200 font-bold uppercase tracking-wider text-[10px]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Account Security Status
            </div>

            <div className="space-y-2 text-slate-400">
              <div className="flex items-center justify-between">
                <span>Supabase Auth:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Encrypted JWT
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Row-Level Security:</span>
                <span className="text-blue-400 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Enforced
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Account Status:</span>
                <span className="text-emerald-400 font-semibold">Active & Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Profile Data Fields */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Application Profile Information</h3>
                <p className="text-xs text-slate-400">Standard account fields stored in Supabase Postgres</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenEditModal}
                className="text-blue-400 hover:text-blue-300 text-xs"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            </div>

            {/* Profile Fields List */}
            <div className="space-y-4 text-xs">
              {/* Name */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-slate-800/60 gap-1">
                <span className="text-slate-400 font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" /> Full Name
                </span>
                <span className="font-bold text-white text-sm">
                  {profile?.full_name || 'Not Specified'}
                </span>
              </div>

              {/* Login ID / UUID */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-slate-800/60 gap-1">
                <span className="text-slate-400 font-medium flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-slate-500" /> Login ID (User UUID)
                </span>
                <span className="font-mono text-xs text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  {user?.id}
                </span>
              </div>

              {/* Email */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-slate-800/60 gap-1">
                <span className="text-slate-400 font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" /> Email Address
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-200">{user?.email}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    Verified
                  </span>
                </div>
              </div>

              {/* Role */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-slate-800/60 gap-1">
                <span className="text-slate-400 font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-500" /> Assigned Role
                </span>
                <div>{getRoleBadge(profile?.role)}</div>
              </div>

              {/* Account Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-slate-800/60 gap-1">
                <span className="text-slate-400 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-500" /> Account Status
                </span>
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active & Operational
                </span>
              </div>

              {/* Created Date */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 gap-1">
                <span className="text-slate-400 font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" /> Account Created Date
                </span>
                <span className="font-mono text-slate-300">{formattedCreatedDate}</span>
              </div>
            </div>
          </div>

          {/* Quick Password Management Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Authentication & Password</h3>
                  <p className="text-xs text-slate-400">Update account password via Supabase Auth</p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setPasswordError(null);
                  setIsPasswordModalOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs"
              >
                Change Password
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Edit Profile (Full Name) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile Information"
        maxWidth="md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <FormField label="Full Name" htmlFor="profile-fullname" required>
            <input
              id="profile-fullname"
              type="text"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              placeholder="e.g. Parmeet CS"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </FormField>

          <FormField label="Email Address (Read-Only)" htmlFor="profile-email-readonly">
            <input
              id="profile-email-readonly"
              type="text"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-500 cursor-not-allowed font-mono"
            />
          </FormField>

          <FormField label="Role (Read-Only)" htmlFor="profile-role-readonly">
            <input
              id="profile-role-readonly"
              type="text"
              value={profile?.role || 'inventory_user'}
              disabled
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-500 cursor-not-allowed uppercase font-semibold"
            />
          </FormField>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={savingProfile}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {savingProfile && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Change Password */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPasswordError(null);
        }}
        title="Change Security Password"
        maxWidth="md"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-center gap-2.5 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {/* Current Password */}
          <FormField label="Current Password" htmlFor="profile-curr-pass" required>
            <div className="relative">
              <input
                id="profile-curr-pass"
                type={showCurrentPass ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full px-3 py-2 pr-10 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                aria-label={showCurrentPass ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>

          {/* New Password */}
          <FormField label="New Password" htmlFor="profile-new-pass" required helperText="Must be at least 6 characters long">
            <div className="relative">
              <input
                id="profile-new-pass"
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3 py-2 pr-10 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                aria-label={showNewPass ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>

          {/* Confirm Password */}
          <FormField label="Confirm New Password" htmlFor="profile-confirm-pass" required>
            <div className="relative">
              <input
                id="profile-confirm-pass"
                type={showConfirmPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2 pr-10 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPasswordModalOpen(false);
                setPasswordError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={changingPassword}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold"
            >
              {changingPassword && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
