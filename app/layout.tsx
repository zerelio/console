import type { Metadata } from 'next';
import './globals.css';
import { ClientShell } from '@/app/components/ClientShell';

export const metadata: Metadata = {
  title: 'Zerelio Console',
  description: 'Infrastructure Discovery Platform — Management Console',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex" style={{ background: '#0a0a0a' }}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
