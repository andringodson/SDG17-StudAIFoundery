import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

/* globals.css named 'Inter' in --font-sans but nothing ever loaded it, so the
   whole site silently fell back to Helvetica/Arial. next/font downloads and
   self-hosts it at build time — no runtime request to Google, and no layout
   shift, since the fallback metrics are matched automatically. */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});
import { StatusBarProvider } from '@/components/statusbar/StatusBarContext';
import { StatusBar } from '@/components/statusbar/StatusBar';
import { Header } from '@/components/Header';
import { InteractiveBackground } from '@/components/InteractiveBackground';
import { AssistantLauncher } from '@/components/assistant/AssistantLauncher';

export const metadata: Metadata = {
  title: 'SDG 17 · Global Partnership Platform',
  description:
    'Explore how collaboration in finance, technology, skills, trade and policy can accelerate sustainable development. All figures in Indian Rupees.',
  // Mirrors src/components/Logo.tsx — two interlocking rings. Stroke is
  // heavier here than in the component (2.2 vs 1.7) because a 16px favicon
  // drops hairlines entirely.
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cg fill='none' stroke-width='2.2'%3E%3Ccircle cx='15.4' cy='20' r='9.4' stroke='%23dff9ff'/%3E%3Ccircle cx='24.6' cy='20' r='9.4' stroke='%2343d6f2'/%3E%3C/g%3E%3C/svg%3E"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a className="skiplink" href="#main">
          Skip to main content
        </a>
        <div id="top" />
        <InteractiveBackground />
        <StatusBarProvider>
          <Header />
          {children}
          <StatusBar />
          <AssistantLauncher />
        </StatusBarProvider>
      </body>
    </html>
  );
}
