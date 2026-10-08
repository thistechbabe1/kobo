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
      {/* Fixed Desktop Sidebar (w-64, fixed inset-y-0 left-0 h-dvh) */}
      <Sidebar />

      {/* Main Content Wrapper — offset by sidebar width (lg:pl-64) so nothing hides under it */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Slim Demo Disclaimer Banner */}
        <SlimDisclaimer />

        {/* Main Header */}
        <Header />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (390px) */}
      <BottomNav />
    </div>
  );
}
