
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import type { Metadata } from 'next';
import Providers from '@/components/auth/providers';


export const metadata: Metadata = {
  title: 'AI Research Engine',
  description: 'Research engine powered by AI and autonomous web exploration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
                   <Providers>

                  
          {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}