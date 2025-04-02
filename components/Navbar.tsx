"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowRight, ZapIcon } from "lucide-react";
import  ThemeSwitcher  from "./theme-switcher";
import { Button } from "./ui/button";

export function MainNavbar() {
  const navItems = [
    { name: "Features", link: "#features" },
    { name: "Pricing", link: "#pricing" },
    { name: "About", link: "#about" },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [activeItem, setActiveItem] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAuthNavigation = () => {
    router.push(isSignedIn ? "/main" : "/auth/signin");
  };

  const handleGetStarted = () => {
    router.push(isSignedIn ? "/main" : "/auth/signup");
  };

  return (
    <header className="fixed top-0 left-0 z-50 w-full font-serif">
      <nav className="px-2 w-full">
        <div className={cn(
          "mx-auto mt-4 max-w-6xl px-6 transition-all duration-300 lg:px-12",
          isScrolled && "bg-white/90 max-w-5xl rounded-full border border-gray-100 shadow-sm backdrop-blur-lg dark:bg-black/90 dark:border-gray-800 lg:px-8"
        )}>
          <div className="relative flex justify-between items-center py-3 lg:py-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Image src="/blaze.png" alt="Blaze Research" width={40} height={40} priority />
              <span className="font-bold text-xl tracking-tight">
                Blaze<span className="text-primary">Research</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:block">
              <ul className="flex gap-8 text-sm">
                {navItems.map((item, idx) => (
                  <li key={idx}>
                    <Link
                      href={item.link}
                      className="group block relative hover:shadow-md text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                      onMouseEnter={() => setActiveItem(idx)}
                      onMouseLeave={() => setActiveItem(null)}
                    >
                      <span>{item.name}</span>
                      <span className="absolute bottom-0 left-0 bg-gray-900 dark:bg-gray-100 w-0 group-hover:w-full h-0.5 transition-all duration-300"></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Auth Buttons */}
         
            <div className="flex items-center gap-3">
              {isSignedIn ? (
                <Button onClick={() => router.push("/main")} className="bg-black dark:bg-white">
                  <span>Dashboard</span>
                  <ZapIcon className="ml-1 size-2.5 fill-orange-500 text-orange-500" />
                </Button>
              ) : (
                <>
                  <button
                    onClick={handleAuthNavigation}
                    className="hidden lg:block hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 text-sm"
                  >
                    Login
                  </button>
                  <button
                    onClick={handleGetStarted}
                    className=" lg:block bg-gradient-to-r from-violet-700 hover:from-violet-800 to-violet-600 hover:to-violet-600 shadow-sm hover:shadow-md rounded-lg text-white px-4 py-2 text-sm flex items-center gap-1.5"
                  >
                    Get Started
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
                 <ThemeSwitcher />

              {/* Mobile Menu Button */}
              <div className="lg:hidden flex items-center gap-2">
                <ThemeSwitcher />
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-md text-gray-700 dark:text-gray-300"
                  aria-label="Toggle menu"
                >
                  <svg className={cn("h-6 w-6 transition-transform", isMobileMenuOpen ? "rotate-90" : "rotate-0")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="lg:hidden bg-white dark:bg-black border-t dark:border-gray-800 mt-2 mx-4 rounded-xl shadow-lg">
            <div className="px-4 py-6 space-y-4">
              {navItems.map((item, idx) => (
                <Link key={`mobile-${idx}`} href={item.link} onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {item.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}