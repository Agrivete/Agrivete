import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LandingPage from '@/components/marketing/LandingPage';
import { verifyToken } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Agrivet — Sales and stock, in step',
  description:
    'A practical sales, inventory, supplier, and expiry tracking system for agricultural supply shops.',
  openGraph: {
    title: 'Agrivet — Sales and stock, in step',
    description:
      'A practical sales, inventory, supplier, and expiry tracking system for agricultural supply shops.',
    type: 'website',
  },
};

async function hasAuthenticatedUser(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('agrivet_token')?.value;
  return Boolean(token && verifyToken(token)?.role);
}

export default async function HomePage() {
  if (await hasAuthenticatedUser()) {
    redirect('/dashboard');
  }

  return <LandingPage />;
}
