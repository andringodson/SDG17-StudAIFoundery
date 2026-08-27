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
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='11' fill='%2307151d' stroke='%2343d6f2'/%3E%3Cg stroke='%23dff9ff' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round' fill='none'%3E%3Cpath d='M9 13.5 15.4 9.5 21.8 13.5 21.8 20.8 15.4 24.7 9 20.8Z'/%3E%3Cpath d='M18.2 19.2 24.6 15.3 31 19.2 31 26.5 24.6 30.5 18.2 26.5Z'/%3E%3Cpath d='M18.2 20 21.8 20' stroke='%2343d6f2'/%3E%3C/g%3E%3C/svg%3E"
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
