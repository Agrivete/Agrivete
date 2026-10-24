import Link from 'next/link';
import { Sprout, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f4f7f2] dark:bg-slate-950 flex flex-col justify-between p-6 text-slate-900 dark:text-slate-100">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-green-800 dark:bg-green-700 flex items-center justify-center shadow-sm">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-green-950 dark:text-green-100">
            Agrivet
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="max-w-md w-full mx-auto text-center space-y-6 my-auto py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 font-mono text-xl font-bold border border-green-200 dark:border-green-900">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Page not found
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            The route or inventory record you requested doesn&apos;t exist or may have been moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-800 hover:bg-green-700 text-white text-sm font-medium transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-slate-500 dark:text-slate-500 py-2">
        Agrivet Supply Store Management System &mdash; Sales, Inventory &amp; Supplier Operations
      </footer>
    </div>
  );
}

