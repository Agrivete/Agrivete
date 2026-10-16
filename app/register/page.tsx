'use client';

import Link from 'next/link';
import { Suspense, useState, type FormEvent, type ChangeEvent } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, ShieldCheck, Eye, EyeOff, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { AgrivetLogo } from '@/components/brand';
import { toast } from 'sonner';

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="register-loading" aria-label="Loading sign-up">
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!name.trim()) {
      setError('Name is required');
      return false;
    }
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return false;
    }
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email address');
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
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      toast.success('Account created successfully');
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <main className="register-main">
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <AgrivetLogo size="sm" variant="dark" href="/" showWordmark={true} />
              <Link className="register-back" href="/">
                <ArrowLeft aria-hidden="true" className="h-4 w-4 mr-1" />
                Back to Agrivet
              </Link>
            </div>

            <div className="space-y-2 text-center mb-6">
              <h1 className="text-2xl font-bold text-neutral-900">Create your account</h1>
              <p className="text-neutral-500">Join your team on Agrivet.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Name field */}
              <Input
                id="name"
                label="Full name"
                type="text"
                placeholder="Juan Dela Cruz"
                value={name}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
                required
                autoComplete="name"
                disabled={loading}
              />

              {/* Email field */}
              <Input
                id="email"
                label="Email address"
                type="email"
                placeholder="you@agrivet.com"
                value={email}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />

              {/* Password field */}
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="pr-10"
                    placeholder="Create a password (min 8 characters)"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    error={error && password && password.length < 8 ? 'Password must be at least 8 characters' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm password field */}
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    className="pr-10"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    error={error && confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                loading={loading}
                size="mobile"
                fullWidth
                className="mt-2"
              >
                <span>Create account</span>
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </form>

            <p className="flex items-center justify-center gap-2 text-sm text-neutral-500 mt-6">
              <ShieldCheck className="h-4 w-4" />
              Role-based access for owners, managers, and staff
            </p>

            <p className="text-center text-sm text-neutral-500 mt-4">
              Already have an account? <Link href="/login" className="text-brand-700 font-medium hover:underline">Sign in</Link>
            </p>

            <p className="text-center text-xs text-neutral-400 mt-8">Agrivet · Sales, inventory, and supplier management</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}