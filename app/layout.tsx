
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import type { Metadata } from 'next';
import Providers from '@/components/auth/providers';
import { MainNavbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Blaze Research | AI-Powered Research Engine',
  description: 'Deep research engine powered by AI and autonomous web exploration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-serif">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <MainNavbar />
            <main className="pt-20 md:pt-24">
              {children}
            </main>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}