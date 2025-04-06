import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";


import { Button } from "@/components/ui/button";

import Container from "@/components/Contanier";

const Hero = () => {
    return (
        <div className="relative flex flex-col justify-center items-center py-20 w-full">

            <div className="lg:hidden top-0 left-1/2 -z-10 absolute flex bg-blue-500 blur-[10rem] rounded-full size-40 -translate-x-1/2"></div>

            <div className="relative flex flex-col justify-center items-center gap-y-8">
                {/* <Container className="hidden top-0 -z-10 absolute inset-0 lg:flex flex-col justify-center items-center mb-auto w-full min-h-screen">
                    <OrbitingCircles
                        speed={0.5}
                        radius={300}
                    >
                        <Icons.circle1 className="size-4 text-foreground/70" />
                        <Icons.circle2 className="size-1 text-foreground/80" />
                    </OrbitingCircles>
                    <OrbitingCircles
                        speed={0.25}
                        radius={400}
                    >
                        <Icons.circle2 className="size-1 text-foreground/50" />
                        <Icons.circle1 className="size-4 text-foreground/60" />
                        <Icons.circle2 className="size-1 text-foreground/90" />
                    </OrbitingCircles>
                    <OrbitingCircles
                        speed={0.1}
                        radius={500}
                    >
                        <Icons.circle2 className="size-1 text-foreground/50" />
                        <Icons.circle2 className="size-1 text-foreground/90" />
                        <Icons.circle1 className="size-4 text-foreground/60" />
                        <Icons.circle2 className="size-1 text-foreground/90" />
                    </OrbitingCircles>
                </Container> */}

                <div className="flex flex-col justify-center items-center gap-y-4 text-center">
                    <Container className="hidden lg:block relative overflow-hidden">
                        <button className="group relative grid shadow-[0_1000px_0_0_hsl(0_0%_15%)_inset] mx-auto px-2 py-1 rounded-full overflow-hidden transition-colors duration-200">
                            <span>
                                <span className="absolute before:absolute inset-0 before:bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] rounded-full w-[100%] before:w-[200%] h-[100%] before:aspect-square overflow-hidden before:content-[''] before:rotate-[-90deg] animate-flip before:animate-rotate spark mask-gradient [mask:linear-gradient(white,_transparent_50%)] before:[inset:0_auto_auto_50%] before:[translate:-50%_-15%]" />
                            </span>
                            <span className="absolute inset-[1px] bg-background group-hover:bg-neutral-800 rounded-full transition-colors duration-200 backdrop" />
                            <span className="z-10 flex items-center py-0.5 text-neutral-100 text-sm">
                                <span className="flex justify-center items-center bg-gradient-to-r from-sky-400 to-blue-600 mr-2 px-2 py-[0.5px] rounded-full h-[18px] font-medium text-[9px] text-white tracking-wide">
                                    NEW
                                </span>
                                Explore the 2024 recap
                            </span>
                        </button>
                    </Container>
                    <Container delay={0.15}>
                        <h1 className="mx-auto max-w-4xl font-bold text-4xl md:text-4xl lg:text-7xl text-center !leading-tight">
                            Transform your {" "}
                            <span className="">
                                marketing {" "}
                            </span>
                            with AI Precision
                        </h1>
                    </Container>
                    <Container delay={0.2}>
                        <p className="mx-auto mt-2 max-w-xl text-muted-foreground text-base lg:text-lg text-center">
                            AI-powered automation and insights to maximize your campaigns and grow your brand.
                        </p>
                    </Container>
                    <Container delay={0.25} className="z-20">
                        <div className="flex justify-center items-center gap-x-4 mt-6">
                            <Link href="#" className="group flex items-center gap-2">
                                <Button size="lg">
                                    Start Free Trial
                                    <ArrowRightIcon className="size-4 transition-all group-hover:translate-x-1 duration-300" />
                                </Button>
                            </Link>
                        </div>
                    </Container>
                    <Container delay={0.3} className="relative">
                        <div className="relative backdrop-blur-lg mx-auto mt-10 p-2 border border-border rounded-xl lg:rounded-[32px] max-w-6xl">
                            <div className="top-1/8 left-1/2 -z-10 absolute inset-0 bg-gradient-to-r from-sky-500 to-blue-600 blur-[4rem] lg:blur-[10rem] w-1/2 lg:w-3/4 h-1/4 -translate-x-1/2 -translate-y-1/2 animate-image-glow"></div>
                            <div className="hidden lg:block -top-1/8 left-1/2 -z-20 absolute inset-0 bg-blue-600 blur-[10rem] w-1/4 h-1/4 -translate-x-1/2 -translate-y-1/2 animate-image-glow"></div>

                            <div className="bg-background border border-border rounded-lg lg:rounded-[22px]">
                                <Image
                                    src="/images/dashboard.png"
                                    alt="dashboard"
                                    width={1920}
                                    height={1080}
                                    className="rounded-lg lg:rounded-[20px]"
                                />
                            </div>

                        </div>
                        <div className="bottom-0 absolute inset-x-0 bg-gradient-to-t from-background to-transparent w-full h-1/2"></div>
                    </Container>

                </div>
            </div>
        </div>
    )
};

export default Hero