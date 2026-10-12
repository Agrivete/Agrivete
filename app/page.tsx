import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Leaf, ArrowRight, Shield, Package, TrendingUp, Truck, BarChart3, CheckCircle, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Agrivet — Sales, Inventory & Supplier Management',
  description: 'Complete management system for agricultural supply businesses. Track sales, monitor inventory, manage suppliers, and stay compliant — all in one platform.',
  openGraph: {
    title: 'Agrivet — Sales, Inventory & Supplier Management',
    description: 'Complete management system for agricultural supply businesses.',
    type: 'website',
  },
};

async function getUserRole(): Promise<'owner' | 'manager' | 'staff' | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('agrivet_token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return (payload?.role as 'owner' | 'manager' | 'staff') ?? null;
}

export default async function LandingPage() {
  const userRole = await getUserRole();
  if (userRole) {
    redirect('/dashboard');
  }

  const features = [
    {
      icon: Package,
      title: 'Smart Inventory',
      description: 'Real-time stock levels with low-stock alerts, FEFO expiration tracking, and multi-location support.',
    },
    {
      icon: TrendingUp,
      title: 'Sales Analytics',
      description: 'Track daily revenue, profit margins, top products, and customer trends with owner-only profitability reports.',
    },
    {
      icon: Truck,
      title: 'Supplier Management',
      description: 'Manage purchase orders, receiving workflows, on-time delivery rates, and supplier performance.',
    },
    {
      icon: BarChart3,
      title: 'Exportable Reports',
      description: 'Generate PDF, CSV, or JSON reports for sales, inventory, profitability, and supplier performance.',
    },
    {
      icon: Shield,
      title: 'Role-Based Access',
      description: 'Owner, Manager, and Staff roles with granular permissions — cost data hidden from non-owners.',
    },
    {
      icon: Sparkles,
      title: 'Offline-Ready',
      description: 'Queue actions locally when connectivity drops; auto-sync when back online.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-brand-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-700/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        
        <nav className="relative flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Agrivet</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">Management System</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <a href="/login" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Sign in
            </a>
            <a 
              href="/login" 
              className="px-4 py-2 rounded-xl bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-colors"
            >
              Get Started
            </a>
          </div>
        </nav>

        <main className="relative px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 mb-6 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              <span>Built for agricultural supply businesses in the Philippines</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
              Complete control over your{' '}
              <span className="text-brand-300">agri-supply operations</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/70 mb-8 max-w-2xl mx-auto leading-relaxed">
              Track sales, monitor stock, manage suppliers, and generate compliance reports — 
              all from one intuitive dashboard. Built for Philippine agri-vet businesses.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="/login" 
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white text-brand-800 text-base font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </a>
              <a 
                href="#features" 
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/10 text-white text-base font-semibold hover:bg-white/20 transition-colors border border-white/20 flex items-center justify-center gap-2"
              >
                <Shield className="h-5 w-5" />
                View Features
              </a>
            </div>
          </div>
        </main>

        {/* Trust indicators */}
        <div className="relative px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 text-white/50 text-sm font-medium">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-brand-400" />
              RBAC Enabled
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-brand-400" />
              FEFO Compliant
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-brand-400" />
              BIR-Ready Reports
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-brand-400" />
              Offline Sync
            </span>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Everything you need to run your agri-supply business
          </h2>
          <p className="text-slate-600 text-lg">
            Purpose-built features for Philippine agricultural supply chains — no generic ERP bloat.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article 
                key={feature.title}
                className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-brand-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 mb-4 group-hover:bg-brand-100 transition-colors">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8 bg-brand-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to streamline your operations?
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Join agri-supply businesses across the Philippines using Agrivet. 
            Setup takes minutes, not months.
          </p>
          <a 
            href="/login" 
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-brand-800 text-lg font-semibold hover:bg-white/90 transition-colors"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12 sm:px-6 lg:px-8 bg-slate-100 border-t border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
                  <Leaf className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Agrivet</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Management System</p>
                </div>
              </div>
              <p className="text-slate-600 text-sm max-w-xs">
                Complete sales, inventory, and supplier management for Philippine agricultural supply businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>Sales & POS</li>
                <li>Inventory Tracking</li>
                <li>Expiration Alerts</li>
                <li>Supplier Management</li>
                <li>Reports & Exports</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>About Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Contact</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>&copy; 2025 Agrivet System. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-slate-700">Privacy</a>
              <a href="#" className="hover:text-slate-700">Terms</a>
              <a href="#" className="hover:text-slate-700">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}