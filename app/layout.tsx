import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'LinkLab | Link management',
  description: 'Manage short links, review redirect activity, and run service checks.',
  icons: { icon: '/favicon.svg' },
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
