import { Settings, Shield, Key } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      {/* Profile */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5 text-navy-400" />
          <h3 className="text-base font-semibold text-white">Profile Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={user?.name || ''} readOnly />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={user?.email || ''} readOnly />
          </div>
          <div>
            <label className="label">Role</label>
            <input className="input" value={user?.role || ''} readOnly />
          </div>
          <div>
            <label className="label">MFA Status</label>
            <input className="input" value={user?.mfaEnabled ? 'Enabled ✅' : 'Disabled'} readOnly />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-accent-400" />
          <h3 className="text-base font-semibold text-white">Security</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface-800/40 rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
              <p className="text-xs text-surface-400">Secure your account with TOTP</p>
            </div>
            <button className={user?.mfaEnabled ? 'btn-secondary text-sm' : 'btn-primary text-sm'}>
              {user?.mfaEnabled ? 'Configured' : 'Enable MFA'}
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-surface-800/40 rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">Change Password</p>
              <p className="text-xs text-surface-400">Update your login credentials</p>
            </div>
            <button className="btn-secondary text-sm">
              <Key className="w-4 h-4" /> Change
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="glass-card p-6">
        <h3 className="text-base font-semibold text-white mb-3">About</h3>
        <div className="space-y-2 text-sm text-surface-400">
          <p><span className="text-surface-300">Version:</span> 1.0.0</p>
          <p><span className="text-surface-300">Encryption:</span> AES-256-GCM</p>
          <p><span className="text-surface-300">Auth:</span> JWT + TOTP MFA</p>
          <p><span className="text-surface-300">Database:</span> PostgreSQL 16</p>
        </div>
      </div>
    </div>
  );
}
