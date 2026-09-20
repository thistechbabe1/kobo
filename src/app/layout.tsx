import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kobo - Digital Wallet & Payments Demo',
  description: 'Mock digital wallet and payments dashboard for Nigerian users.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200 antialiased selection:bg-[#0D7855]/20 selection:text-[#0D7855]">
        {children}
      </body>
    </html>
  );
}
