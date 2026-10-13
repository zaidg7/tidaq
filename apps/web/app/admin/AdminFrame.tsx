import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';

/** Centred column with the logo: shared by the admin pages. */
export function AdminFrame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      className={`mx-auto flex w-full flex-1 flex-col gap-8 px-5 py-10 md:px-7 lg:py-16 ${
        wide ? 'max-w-[1080px]' : 'max-w-[440px]'
      }`}
    >
      <div className="flex items-center gap-3">
        <Logo />
        <span className="text-eyebrow text-accent">Admin</span>
      </div>
      {children}
    </div>
  );
}
