'use client';

import Link from 'next/link';
import { Suspense, useState, type FormEvent, type ChangeEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  TrendingUp,
  Truck,
  ShieldAlert,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AgrivetLogo } from '@/components/brand';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-brand-950 text-brand-300">
          <AgrivetLogo size="md" variant="light" showWordmark={false} />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'owner' | 'staff'>('owner');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!name.trim()) {
      setError('Full name is required');
      return false;
    }
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return false;
    }
    if (!email.trim()) {
      setError('Email address is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!password) {
      setError('Password is required');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password, role });
      toast.success('Account created successfully');
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col lg:grid lg:grid-cols-2">
      {/* Left Column: Brand & Value Prop Showcase (Desktop / Widescreen) */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 p-12 text-white">
        {/* Background Landscape Photo with Deep Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/hungduan-hapao-rice-terraces-flickr.jpg"
            alt="Agricultural farm supply landscape"
            className="h-full w-full object-cover opacity-20 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/85 to-brand-900/50" />
        </div>

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <AgrivetLogo size="md" variant="light" href="/" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-medium text-brand-200 backdrop-blur-md border border-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Poultry & Farm Management
          </span>
        </div>

        {/* Center Content / Value Props */}
        <div className="relative z-10 my-auto max-w-lg py-10">
          <div className="inline-flex items-center gap-2 rounded-lg bg-brand-800/80 px-3 py-1.5 text-xs font-semibold text-brand-200 mb-6 border border-brand-700/60 shadow-inner">
            <ShieldCheck className="h-4 w-4 text-brand-300" />
            Team Member Registration
          </div>

          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold tracking-tight text-white leading-tight">
            Equip your store team with modern inventory tools.
          </h1>

          <p className="mt-4 text-base text-brand-100/85 leading-relaxed">
            Join your shop's operations on Agrivet. Handle checkout transactions, receive supplier
            shipments, and monitor stock balances with automated audit trails.
          </p>

          {/* Feature Highlights */}
          <div className="mt-8 space-y-3.5">
            <div className="flex items-start gap-3.5 rounded-xl bg-white/5 p-3.5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-700 text-white font-bold">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Strict Role-Based Protection</h2>
                <p className="text-xs text-brand-200/80 mt-0.5">
                  Buying costs, net margins, and profit metrics remain strictly restricted to the business Owner.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl bg-white/5 p-3.5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-700 text-white font-bold">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Speedy Counter Checkout</h2>
                <p className="text-xs text-brand-200/80 mt-0.5">
                  Designed for 50–100+ daily customer purchases of feeds, medicines, and agricultural supplies.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl bg-white/5 p-3.5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-700 text-white font-bold">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Supplier & Purchase Orders</h2>
                <p className="text-xs text-brand-200/80 mt-0.5">
                  Keep purchase orders and stock receiving receipts connected in one seamless workflow.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Note */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-brand-200/70">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Secure 256-bit encrypted credential storage</span>
          </div>
          <span>Automatic Audit Logging</span>
        </div>
      </div>

      {/* Right Column: Clean, Polished Registration Form */}
      <div className="flex min-h-screen flex-1 flex-col justify-between p-6 sm:p-10 lg:p-14 bg-white lg:bg-slate-50">
        {/* Top bar with back to home link */}
        <div className="flex items-center justify-between w-full">
          <div className="lg:hidden">
            <AgrivetLogo size="sm" variant="dark" href="/" />
          </div>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-brand-900 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Agrivet
          </Link>
        </div>

        {/* Center Register Card */}
        <div className="my-auto mx-auto w-full max-w-md py-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-sm">
            <div className="text-center mb-6">
              <div className="inline-flex justify-center mb-4 lg:hidden">
                <AgrivetLogo size="md" variant="dark" href="/" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h2>
              <p className="text-sm text-slate-500 mt-1">
                Join your team on the Agrivet operations terminal.
              </p>
            </div>

            {error && (
              <div
                className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 text-xs text-red-700 border border-red-200"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    placeholder="Juan Dela Cruz"
                    value={name}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
                    required
                    autoComplete="name"
                    disabled={loading}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@agrivet.com"
                    value={email}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    disabled={loading}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password (min. 8 characters)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={password}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirmPassword(event.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-2">
                  Account role
                </span>
                <RadioGroup
                  value={role}
                  onValueChange={(val) => setRole(val as 'owner' | 'staff')}
                  className="grid grid-cols-2 gap-3"
                >
                  <label
                    htmlFor="role-owner"
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-xs font-semibold transition ${
                      role === 'owner'
                        ? 'border-brand-700 bg-brand-50/60 text-brand-900 ring-1 ring-brand-700/30'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <RadioGroupItem value="owner" id="role-owner" />
                    <span>Business Owner</span>
                  </label>
                  <label
                    htmlFor="role-staff"
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-xs font-semibold transition ${
                      role === 'staff'
                        ? 'border-brand-700 bg-brand-50/60 text-brand-900 ring-1 ring-brand-700/30'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <RadioGroupItem value="staff" id="role-staff" />
                    <span>Staff</span>
                  </label>
                </RadioGroup>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span>Creating account...</span>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500 border border-slate-100">
              <ShieldCheck className="h-4 w-4 text-brand-700" />
              <span>Role-based access: Owner, Manager, and Staff</span>
            </div>

            <div className="mt-5 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-brand-800 hover:text-brand-900 hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 py-2">
          Agrivet · Sales, Inventory, and Supplier Management System
        </div>
      </div>
    </div>
  );
}