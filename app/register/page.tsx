'use client';

import Link from 'next/link';
import { Suspense, useState, type FormEvent, type ChangeEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  User,
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  TrendingUp,
  Truck,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { AgrivetLogo } from '@/components/brand';
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
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validateForm = () => {
    if (!businessName.trim()) {
      setError('Business name is required');
      return false;
    }
    if (businessName.trim().length < 2) {
      setError('Business name must be at least 2 characters');
      return false;
    }
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
      await register({
        name: name.trim(),
        businessName: businessName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setSubmitted(true);
      toast.success('Registration submitted! An admin will review your business shortly.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-brand-50/25 dark:bg-slate-950 flex flex-col lg:grid lg:grid-cols-2">
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
            Business Onboarding
          </div>

          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold tracking-tight text-white leading-tight">
            Equip your store team with modern inventory tools.
          </h1>

          <p className="mt-4 text-base text-brand-100/85 leading-relaxed">
            Register your agricultural supply store on Agrivet. Once approved by our platform team,
            manage checkout transactions, receive shipments, and invite your store staff.
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
      <div className="flex h-full min-h-screen lg:h-screen lg:overflow-hidden flex-1 flex-col justify-between p-3.5 sm:p-5 lg:px-8 lg:py-4 bg-brand-50/25 dark:bg-slate-950">
        {/* Top bar with back to home link */}
        <div className="flex items-center justify-between w-full shrink-0">
          <div className="lg:hidden">
            <AgrivetLogo size="sm" variant="dark" href="/" />
          </div>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-900 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Agrivet
          </Link>
        </div>

        {/* Center Register Card */}
        <div className="my-auto mx-auto w-full max-w-md py-1">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
            {submitted ? (
              <div className="text-center py-4 space-y-3">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                  Registration submitted! An admin will review your business shortly.
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your account for <span className="font-semibold text-slate-800 dark:text-slate-200">{businessName}</span> is currently
                  pending approval by the platform administrator. Once approved, you can sign in and create staff
                  accounts for your business.
                </p>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-900"
                  >
                    <span>Return to Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-3">
                  <div className="inline-flex justify-center mb-2 lg:hidden">
                    <AgrivetLogo size="md" variant="dark" href="/" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                    Register your Agrivet Business
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Submit your store details for platform administrator approval.
                  </p>
                </div>

                {error && (
                  <div
                    className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/50 p-2.5 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900"
                    role="alert"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <form className="space-y-2.5" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="businessName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Business Name
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <input
                        id="businessName"
                        type="text"
                        placeholder="GreenFields Agrivet Supply"
                        value={businessName}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setBusinessName(event.target.value)}
                        required
                        disabled={loading}
                        className="h-9 sm:h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Owner Full Name
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
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
                        className="h-9 sm:h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        placeholder="owner@agrivet.com"
                        value={email}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                        required
                        autoComplete="email"
                        disabled={loading}
                        className="h-9 sm:h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Password (min. 8 characters)
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
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
                        className="h-9 sm:h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-9 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
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
                        className="h-9 sm:h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-9 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2.5 flex h-9 sm:h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <span>Submitting registration...</span>
                    ) : (
                      <>
                        <span>Register Business</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-700 dark:text-brand-400" />
                  <span>Owner accounts require Platform Admin approval</span>
                </div>

                <div className="mt-2.5 text-center text-xs text-slate-500 dark:text-slate-400">
                  Already have an approved account?{' '}
                  <Link href="/login" className="font-semibold text-brand-800 dark:text-brand-400 hover:text-brand-900 hover:underline">
                    Sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-1 shrink-0">
          Agrivet · Sales, Inventory, and Supplier Management System
        </div>
      </div>
    </div>
  );
}