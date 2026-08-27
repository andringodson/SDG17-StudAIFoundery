import type { Metadata } from 'next';
import './globals.css';
import { StatusBarProvider } from '@/components/statusbar/StatusBarContext';
import { StatusBar } from '@/components/statusbar/StatusBar';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'SDG 17 · Global Partnership Platform',
  description:
    'Explore how collaboration in finance, technology, skills, trade and policy can accelerate sustainable development. All figures in Indian Rupees.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230A3A60'/%3E%3Ccircle cx='11' cy='12' r='3.4' fill='%2300AED6'/%3E%3Ccircle cx='21' cy='12' r='3.4' fill='%232EC4B6'/%3E%3Ccircle cx='16' cy='21' r='3.4' fill='%231F69B3'/%3E%3C/svg%3E"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skiplink" href="#main">
          Skip to main content
        </a>
        <div id="top" />
        <StatusBarProvider>
          <Header />
          {children}
          <StatusBar />
        </StatusBarProvider>
      </body>
    </html>
  );
}
