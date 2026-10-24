import type { Metadata } from 'next';
import './globals.css';
import './landing-page.css';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Skiper92 } from '@/components/v1/skiper92';

export const metadata: Metadata = {
  title: {
    default: 'Agrivet — Sales and stock, in step',
    template: '%s | Agrivet',
  },
  description:
    'Agrivet connects sales, inventory, suppliers, and expiry tracking for agricultural supply shops.',
  icons: { icon: '/agrivet-icon.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <Toaster />
            <Skiper92 />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
