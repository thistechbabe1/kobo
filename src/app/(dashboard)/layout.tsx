import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { SlimDisclaimer } from '@/components/layout/SlimDisclaimer';

export default function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] transition-colors duration-200">
      {/* Top Slim Demo Disclaimer Banner */}
      <SlimDisclaimer />

      {/* Main Header */}
      <Header />

      {/* Main Shell Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Desktop Sidebar (1440px) */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (390px) */}
      <BottomNav />
    </div>
  );
}
