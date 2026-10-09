'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Reports Error</h2>
      <p className="text-sm text-slate-500 mb-4">
        Reference: <code className="font-mono">{error.digest ?? 'N/A'}</code>
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}