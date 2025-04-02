

import { AuroraText } from '@/components/ui/Magic-text';
import React from 'react';

interface Props {
    children: React.ReactNode
}

const AuthLayout = ({ children }: Props) => {
    return (
        <main className="relative bg-gray-50 w-full min-h-screen font-serif">
            <div className="top-0 left-0 absolute flex justify-center pt-8 w-full">
                <div className="text-center">
                    <h1 className="font-serif font-semibold text-gray-950 dark:text-white text-5xl">
               {/* <AuroraText> Blaze  </AuroraText> */} Blaze
                    </h1>
                    <p className="mt-1 font-serif font-light text-gray-900  dark:text-gray-100 text-sm">Secure authentication</p>
                </div>
            </div>
            
            {children}
            
            <footer className="bottom-0 left-0 absolute pb-4 w-full text-gray-500 text-xs text-center">
                © {new Date().getFullYear()} Blaze. All rights reserved.
            </footer>
        </main>
    );
};

export default AuthLayout

