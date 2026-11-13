import React from 'react';
import StudentHeader from '@/components/navigation/StudentHeader';
import StudentMobileNav from '@/components/navigation/StudentMobileNav';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      <StudentHeader />
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 pb-24 md:pb-8">
        {children}
      </main>
      <StudentMobileNav />
    </div>
  );
}

