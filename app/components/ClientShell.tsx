'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/app/components/Sidebar';
import { AuthProvider } from '@/app/components/AuthProvider';

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isLoginPage = pathname === '/login';

  return (
    <AuthProvider>
      {isLoginPage ? (
        <>{children}</>
      ) : (
        <>
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-0 overflow-auto">
            {children}
          </div>
        </>
      )}
    </AuthProvider>
  );
}
