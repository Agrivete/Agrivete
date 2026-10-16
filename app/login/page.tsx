'use client';

import Link from 'next/link';
import { Suspense, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { AgrivetLogo } from '@/components/brand';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-loading" aria-label="Loading sign-in">
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
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <main className="login-main">
        <div className="login-form-wrap">
          <Card className="w-full">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <AgrivetLogo size="md" variant="dark" href="/" />
                <Link className="login-back" href="/">
                  <ArrowLeft aria-hidden="true" className="mr-1" />
                  Back to Agrivet
                </Link>
              </div>

              <div className="space-y-2 text-center mb-6">
                <h1 className="text-2xl font-bold text-neutral-900">Sign in to Agrivet</h1>
                <p className="text-neutral-500">Use your shop account to continue.</p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@agrivet.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                />

                <Button
                  type="submit"
                  loading={loading}
                  size="mobile"
                  fullWidth
                  className="mt-2"
                >
                  <span>Sign in</span>
                  <ArrowRight aria-hidden="true" />
                </Button>
              </form>

              <p className="flex items-center justify-center gap-2 text-sm text-neutral-500 mt-6">
                <ShieldCheck className="h-4 w-4" />
                Role-based access for owners, managers, and staff
              </p>

              <p className="text-center text-sm text-neutral-500 mt-4">
                Don't have an account? <Link href="/register" className="text-brand-700 font-medium hover:underline">Sign up</Link>
              </p>

              <p className="text-center text-xs text-neutral-400 mt-8">Agrivet · Sales, inventory, and supplier management</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}