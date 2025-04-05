import React from 'react';
import Sidebar from '@/components/layout/sidebar'; // We'll create this next

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-950">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Optional Header could go here */}
        {/* <header className="h-16 border-b flex items-center justify-between px-6"></header> */}

        {/* Scrollable Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-black">
          {/* The page content will be rendered here */}
          {children}
        </main>
      </div>
    </div>
  );
}