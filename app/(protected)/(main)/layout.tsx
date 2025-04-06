import React from 'react';
import Sidebar from '@/components/layout/sidebar'; // We'll create this next

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex bg-gray-100 dark:bg-black w-full h-screen">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Optional Header could go here */}
        {/* <header className="flex justify-between items-center px-6 border-b h-16"></header> */}

      
          {children}

      </div>
    </div>
  );
}