'use client';

import Link from 'next/link';
import { Suspense, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Package,
  Calendar,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AgrivetLogo } from '@/components/brand';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-brand-950 text-brand-300">
          <AgrivetLogo size="md" variant="light" showWordmark={false} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col lg:grid lg:grid-cols-2">
      {/* Left Column: Brand & Welcome Showcase (Desktop / Widescreen) */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 p-12 text-white">
        {/* Agricultural Photo Background with Deep Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/chickens-in-poultry-farm.jpg"
            alt="Poultry and agricultural farm"
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
            Store Management Terminal
          </div>

          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold tracking-tight text-white leading-tight">
            Keep products, sales, and feed inventory in total sync.
          </h1>

          <p className="mt-4 text-base text-brand-100/85 leading-relaxed">
            Tailored for agricultural supply stores and poultry feed dealers. Track incoming shipments,
            prevent stockouts, and safeguard expiring lots with confidence.
          </p>

          {/* Feature Highlights */}
          <div className="mt-8 space-y-3.5">
            <div className="flex items-start gap-3.5 rounded-xl bg-white/5 p-3.5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-700 text-white font-bold">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Automated Stock Reconciliation</h2>
                <p className="text-xs text-brand-200/80 mt-0.5">
                  Monitor live bag counts on-hand with proactive alerts when stock drops below threshold.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl bg-white/5 p-3.5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-700 text-white font-bold">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">30-Day Expiry Lot Monitoring</h2>
                <p className="text-xs text-brand-200/80 mt-0.5">
                  Never discover expired feed bags too late. Automated alerts highlight items nearing expiration.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl bg-white/5 p-3.5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-700 text-white font-bold">
                <WifiOff className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Offline Terminal Resilience</h2>
                <p className="text-xs text-brand-200/80 mt-0.5">
                  Counter sales continue uninterrupted during internet outages and sync safely when reconnected.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Note */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-brand-200/70">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Built for high-volume retail transactions</span>
          </div>
          <span>Confidential & Role-Protected</span>
        </div>
      </div>

      {/* Right Column: Clean, Polished Authentication Form */}
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

        {/* Center Login Card */}
        <div className="my-auto mx-auto w-full max-w-md py-8">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-sm">
            <div className="text-center mb-6">
              <div className="inline-flex justify-center mb-4 lg:hidden">
                <AgrivetLogo size="md" variant="dark" href="/" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to Agrivet</h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter your account credentials to access your store terminal.
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
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
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

              <button
                type="submit"
                disabled={loading}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign in to Terminal</span>
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
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold text-brand-800 hover:text-brand-900 hover:underline">
                Sign up
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