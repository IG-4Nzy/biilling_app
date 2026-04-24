import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Zap, Loader2, Shield } from 'lucide-react';
import { loginSchema, type LoginInput } from '@billing/shared';
import { authService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaMode, setMfaMode] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      const result = await authService.login(data.email, data.password, mfaMode ? mfaCode : undefined);

      if (result.mfaRequired) {
        setMfaMode(true);
        toast('MFA code required', { icon: '🔐' });
        setLoading(false);
        return;
      }

      setAuth(result.user, result.tokens.accessToken, result.tokens.refreshToken);
      toast.success(`Welcome back, ${result.user.name}!`);
      navigate('/dashboard');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-navy-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-accent-600/8 rounded-full blur-[128px]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-navy-900/20 via-transparent to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-navy-500 to-accent-500 rounded-2xl mb-4 shadow-glow">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">BillForge</h1>
          <p className="text-surface-400 mt-1">Enterprise Billing System</p>
        </div>

        {/* Login card */}
        <div className="glass-card p-8">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-navy-400" />
            <h2 className="text-lg font-semibold text-white">
              {mfaMode ? 'Two-Factor Authentication' : 'Sign In'}
            </h2>
          </div>

          {!mfaMode ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" id="login-form">
              <div>
                <label htmlFor="email" className="label">Email Address</label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="admin@billing.com"
                  autoComplete="email"
                  autoFocus
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="label">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
                id="login-submit"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-surface-400">
                Enter the 6-digit code from your authenticator app.
              </p>
              <div>
                <label htmlFor="mfa-code" className="label">Authentication Code</label>
                <input
                  id="mfa-code"
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setMfaMode(false)} className="btn-secondary flex-1">
                  Back
                </button>
                <button
                  onClick={() => {
                    const values = getValues();
                    handleSubmit(() => onSubmit({ ...values, mfaCode }))();
                  }}
                  disabled={mfaCode.length !== 6 || loading}
                  className="btn-primary flex-1"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                </button>
              </div>
            </div>
          )}

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-surface-800">
            <p className="text-xs text-surface-500 text-center mb-2">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const emailField = document.getElementById('email') as HTMLInputElement;
                  const passField = document.getElementById('password') as HTMLInputElement;
                  if (emailField && passField) {
                    emailField.value = 'admin@billing.com';
                    passField.value = 'Admin@1234';
                    // Trigger React form update
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
                    nativeInputValueSetter.call(emailField, 'admin@billing.com');
                    nativeInputValueSetter.call(passField, 'Admin@1234');
                    emailField.dispatchEvent(new Event('input', { bubbles: true }));
                    passField.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }}
                className="text-xs py-1.5 px-3 rounded-md bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
              >
                Admin Login
              </button>
              <button
                type="button"
                onClick={() => {
                  const emailField = document.getElementById('email') as HTMLInputElement;
                  const passField = document.getElementById('password') as HTMLInputElement;
                  if (emailField && passField) {
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
                    nativeInputValueSetter.call(emailField, 'staff@billing.com');
                    nativeInputValueSetter.call(passField, 'Staff@1234');
                    emailField.dispatchEvent(new Event('input', { bubbles: true }));
                    passField.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }}
                className="text-xs py-1.5 px-3 rounded-md bg-navy-500/10 text-navy-400 hover:bg-navy-500/20 transition-colors"
              >
                Staff Login
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-surface-600 mt-6">
          Enterprise Billing System v1.0 • Secured with AES-256
        </p>
      </motion.div>
    </div>
  );
}
