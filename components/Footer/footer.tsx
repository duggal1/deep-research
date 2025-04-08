import Link from "next/link";
import Image from "next/image"; // Use Next.js Image for optimization
import Container from "../global/Contanier";


const Footer = () => {
    return (
        <footer className="relative flex flex-col justify-center items-center mx-auto px-6 lg:px-8 pt-16 pb-8 border-gray-200 dark:border-white/10 border-t w-full max-w-7xl">
            {/* Increased max-width slightly for a more spacious feel */}

            {/* Main Footer Content Grid */}
            <div className="gap-12 grid grid-cols-1 lg:grid-cols-3 w-full">
                {/* Column 1: Brand Info */}
                <Container delay={0} className="flex flex-col items-start">
                    {/* Logo and Name */}
                    <Link href="/" className="group flex items-center gap-2" aria-label="Vetra Home">
                        <Image
                            src="/blaze.png" // Ensure this path is correct relative to your public folder
                            alt="Blaze Logo"
                            width={68} // Adjust size as needed
                            height={68}
                            className="object-contain" // Ensures aspect ratio is maintained
                        />
                       <span
    className="bg-clip-text bg-gradient-to-r from-indigo-500 group-hover:from-indigo-600 via-purple-500 group-hover:via-purple-600 to-pink-500 group-hover:to-pink-600 font-semibold text-transparent text-2xl transition duration-300 // 1. Define the background gradient (choose your modern colors) // Start color // Middle color (optional) // End color // 2. Clip the background to the text shape // 3. Make the text color transparent so the background shows through // Optional: Add subtle hover effect by slightly shifting the gradient // Apply to the gradient colors // Set duration"
>
    Blaze
</span>
                    </Link>
                    {/* Description */}
                    <p className="mt-4 max-w-[280px] text-gray-600 dark:text-gray-400 text-sm text-start">
                        {/* Slightly increased max-width */}
                        AI-powered platform that transforms your marketing workflow in seconds.
                    </p>
                </Container>

                {/* Column 2 & 3: Links Grid (Spans 2 columns on large screens) */}
                <div className="gap-8 grid grid-cols-2 md:grid-cols-4 lg:col-span-2 mt-10 lg:mt-0">
                    {/* Link Group: Product */}
                    <Container delay={0.1}>
                        <h3 className="mb-4 font-medium text-gray-900 dark:text-white text-base">
                            Product
                        </h3>
                        <ul className="space-y-3"> {/* Reduced spacing slightly */}
                            <FooterLink href="#">Features</FooterLink>
                            <FooterLink href="#">Pricing</FooterLink>
                            <FooterLink href="#">Testimonials</FooterLink>
                            <FooterLink href="#">Supported Languages</FooterLink>
                        </ul>
                    </Container>

                    {/* Link Group: Solutions */}
                    <Container delay={0.2}>
                        <h3 className="mb-4 font-medium text-gray-900 dark:text-white text-base">
                            Solutions
                        </h3>
                        <ul className="space-y-3">
                            <FooterLink href="#">Content Creators</FooterLink>
                            <FooterLink href="#">Businesses</FooterLink>
                            <FooterLink href="#">Education</FooterLink>
                            <FooterLink href="#">Enterprise</FooterLink>
                        </ul>
                    </Container>

                    {/* Link Group: Resources */}
                    <Container delay={0.3}>
                        <h3 className="mb-4 font-medium text-gray-900 dark:text-white text-base">
                            Resources
                        </h3>
                        <ul className="space-y-3">
                            <FooterLink href="#">Blog</FooterLink>
                            <FooterLink href="#">Translation Guides</FooterLink>
                            <FooterLink href="#">Support</FooterLink>
                        </ul>
                    </Container>

                    {/* Link Group: Company */}
                    <Container delay={0.4}>
                        <h3 className="mb-4 font-medium text-gray-900 dark:text-white text-base">
                            Company
                        </h3>
                        <ul className="space-y-3">
                            <FooterLink href="#">About Us</FooterLink>
                            <FooterLink href="#">Privacy Policy</FooterLink>
                            <FooterLink href="#">Terms & Conditions</FooterLink>
                        </ul>
                    </Container>
                </div>
            </div>

            {/* Copyright Section */}
            <Container delay={0.5} className="mt-16 pt-8 border-gray-200 dark:border-white/10 border-t w-full">
                {/* Added top border for separation */}
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        © {new Date().getFullYear()} Vetra. All rights reserved.
                    </p>
                </div>
            </Container>
        </footer>
    );
};

// Helper component for consistent link styling
const FooterLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <li>
        <Link
            href={href}
            className="text-gray-600 hover:text-gray-900 dark:hover:text-white dark:text-gray-400 text-sm transition-colors duration-300"
        >
            {children}
        </Link>
    </li>
);


export default Footer;