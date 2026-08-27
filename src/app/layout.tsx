import type { Metadata } from 'next';
import './globals.css';
import { StatusBarProvider } from '@/components/statusbar/StatusBarContext';
import { StatusBar } from '@/components/statusbar/StatusBar';
import { Header } from '@/components/Header';
import { InteractiveBackground } from '@/components/InteractiveBackground';
import { AssistantLauncher } from '@/components/assistant/AssistantLauncher';

export const metadata: Metadata = {
  title: 'SDG 17 · Global Partnership Platform',
  description:
    'Explore how collaboration in finance, technology, skills, trade and policy can accelerate sustainable development. All figures in Indian Rupees.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='9' fill='%23000'/%3E%3Cg stroke='%23ececee' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round' fill='none'%3E%3Cpath d='M9 13.5 14.5 9.5 14.5 30.5'/%3E%3Cpath d='M9 30.5 20 30.5'/%3E%3Cpath d='M22 9.5 33 9.5 23.5 30.5'/%3E%3C/g%3E%3C/svg%3E"
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
