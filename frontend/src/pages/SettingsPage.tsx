import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings, Key, Building2, Upload, Trash2, X, Loader2, Save, ImageIcon } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { authService, companyService } from '../services/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Company profile
  const { data: company, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: companyService.get,
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const isFormDirty = Object.keys(form).length > 0;

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const getVal = (key: string) => form[key] ?? (company?.[key] || '');

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...company, ...form };
      // Remove non-schema fields
      delete payload.id;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.logoPath;
      return companyService.update(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      setForm({});
      toast.success('Company details saved');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Save failed'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => authService.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to change password'),
  });

  const logoMutation = useMutation({
    mutationFn: (file: File) => companyService.uploadLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Logo uploaded');
    },
    onError: () => toast.error('Upload failed'),
  });

  const deleteLogoMutation = useMutation({
    mutationFn: () => companyService.deleteLogo(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Logo removed');
    },
  });

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) logoMutation.mutate(file);
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    changePasswordMutation.mutate();
  };

  const fields = [
    { section: 'Company Information', items: [
      { key: 'name', label: 'Company Name', required: true },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'stateCode', label: 'State Code', halfWidth: true },
      { key: 'pincode', label: 'Pincode', halfWidth: true },
    ]},
    { section: 'Contact', items: [
      { key: 'phone', label: 'Phone', halfWidth: true },
      { key: 'mobile', label: 'Mobile', halfWidth: true },
      { key: 'email', label: 'Email' },
      { key: 'website', label: 'Website' },
    ]},
    { section: 'Registration', items: [
      { key: 'gstin', label: 'GSTIN' },
      { key: 'regNo', label: 'Registration No', halfWidth: true },
      { key: 'factoryRegNo', label: 'Factory Reg No', halfWidth: true },
    ]},
    { section: 'Bank Details', items: [
      { key: 'bankName', label: 'Bank Name' },
      { key: 'bankBranch', label: 'Branch', halfWidth: true },
      { key: 'bankIfsc', label: 'IFSC Code', halfWidth: true },
      { key: 'bankAccount', label: 'Account Number' },
    ]},
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      {/* Profile & Security */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5 text-navy-400" />
          <h3 className="text-base font-semibold text-white">Profile & Security</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        </div>
        <div className="mt-4">
          <button onClick={() => setShowPasswordModal(true)} className="btn-secondary text-sm">
            <Key className="w-4 h-4" /> Change Password
          </button>
        </div>
      </div>

      {/* Company Details — Bill Receipt Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-accent-400" />
            <div>
              <h3 className="text-base font-semibold text-white">Company Details</h3>
              <p className="text-xs text-surface-400">These details appear in the invoice/bill header</p>
            </div>
          </div>
          {isFormDirty && (
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary text-sm">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          )}
        </div>

        {/* Logo Upload */}
        <div className="mb-6 p-4 bg-surface-800/40 rounded-lg">
          <label className="label mb-3">Company Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-surface-700/50 border-2 border-dashed border-surface-600 flex items-center justify-center overflow-hidden">
              {company?.logoPath ? (
                <img src={company.logoPath} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-8 h-8 text-surface-500" />
              )}
            </div>
            <div className="space-y-2">
              <input type="file" ref={fileInputRef} onChange={handleLogoSelect} accept="image/*" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="btn-secondary text-sm"
                disabled={logoMutation.isPending}>
                {logoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload Logo
              </button>
              {company?.logoPath && (
                <button onClick={() => deleteLogoMutation.mutate()} className="btn-secondary text-sm text-red-400 hover:text-red-300"
                  disabled={deleteLogoMutation.isPending}>
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
              <p className="text-[10px] text-surface-500">PNG, JPG, SVG — Max 5MB</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton w-full h-10 rounded" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {fields.map(({ section, items }) => (
              <div key={section}>
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-3">{section}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map(({ key, label, required, halfWidth }) => (
                    <div key={key} className={halfWidth ? '' : 'sm:col-span-2'}>
                      <label className="label">{label} {required && <span className="text-red-400">*</span>}</label>
                      <input
                        className="input"
                        value={getVal(key)}
                        onChange={(e) => updateField(key, e.target.value)}
                        placeholder={label}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPasswordModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Change Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input" placeholder="Enter current password" />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="input" placeholder="Min 8 characters" />
                </div>
                <div>
                  <label className="label">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input" placeholder="Repeat new password" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowPasswordModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={handleChangePassword} disabled={changePasswordMutation.isPending} className="btn-primary flex-1">
                    {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
