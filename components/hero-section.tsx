import React from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { TextEffect } from '@/components/ui/text-effect'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { HeroHeader } from '@/components/hero5-header'

const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring',
                bounce: 0.3,
                duration: 1.5,
            },
        },
    },
}

export default function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main className="overflow-hidden">
                <div
                    aria-hidden
                    className="hidden lg:block isolate absolute inset-0 opacity-65 contain-strict">
                    <div className="top-0 left-0 absolute bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)] rounded-full w-140 h-320 -rotate-45 -translate-y-87.5" />
                    <div className="top-0 left-0 absolute bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] rounded-full w-60 h-320 -rotate-45 [translate:5%_-50%]" />
                    <div className="top-0 left-0 absolute bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] w-60 h-320 -rotate-45 -translate-y-87.5" />
                </div>
                <section>
                    <div className="relative pt-24 md:pt-36">
                        <AnimatedGroup
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            delayChildren: 1,
                                        },
                                    },
                                },
                                item: {
                                    hidden: {
                                        opacity: 0,
                                        y: 20,
                                    },
                                    visible: {
                                        opacity: 1,
                                        y: 0,
                                        transition: {
                                            type: 'spring',
                                            bounce: 0.3,
                                            duration: 2,
                                        },
                                    },
                                },
                            }}
                            className="-z-20 absolute inset-0">
                            <Image
                                src="https://res.cloudinary.com/dg4jhba5c/image/upload/v1741605538/night-background_ni3vqb.jpg"
                                alt="background"
                                className="hidden dark:block top-56 lg:top-32 -z-20 absolute inset-x-0"
                                width="3276"
                                height="4095"
                            />
                        </AnimatedGroup>
                        <div className="-z-10 absolute inset-0 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]"></div>
                        <div className="mx-auto px-6 max-w-7xl">
                            <div className="sm:mx-auto lg:mt-0 lg:mr-auto text-center">
                                <AnimatedGroup variants={transitionVariants}>
                                    <Link
                                        href="#link"
                                        className="group flex items-center gap-4 bg-muted hover:bg-background shadow-md shadow-zinc-950/5 dark:shadow-zinc-950 mx-auto p-1 pl-4 border dark:border-t-white/5 dark:hover:border-t-border rounded-full w-fit transition-colors duration-300">
                                        <span className="text-foreground text-sm">Introducing Support for AI Models</span>
                                        <span className="block bg-white dark:bg-zinc-700 dark:border-background border-l w-0.5 h-4"></span>

                                        <div className="bg-background group-hover:bg-muted rounded-full size-6 overflow-hidden duration-500">
                                            <div className="flex w-12 -translate-x-1/2 group-hover:translate-x-0 duration-500 ease-in-out">
                                                <span className="flex size-6">
                                                    <ArrowRight className="m-auto size-3" />
                                                </span>
                                                <span className="flex size-6">
                                                    <ArrowRight className="m-auto size-3" />
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </AnimatedGroup>

                                <TextEffect
                                    preset="fade-in-blur"
                                    speedSegment={0.3}
                                    as="h1"
                                    className="mt-8 lg:mt-16 xl:text-[5.25rem] text-6xl md:text-7xl text-balance">
                                    Modern Solutions for Customer Engagement
                                </TextEffect>
                                <TextEffect
                                    per="line"
                                    preset="fade-in-blur"
                                    speedSegment={0.3}
                                    delay={0.5}
                                    as="p"
                                    className="mx-auto mt-8 max-w-2xl text-lg text-balance">
                                    Highly customizable components for building modern websites and applications that look and feel the way you mean it.
                                </TextEffect>

                                <AnimatedGroup
                                    variants={{
                                        container: {
                                            visible: {
                                                transition: {
                                                    staggerChildren: 0.05,
                                                    delayChildren: 0.75,
                                                },
                                            },
                                        },
                                        ...transitionVariants,
                                    }}
                                    className="flex md:flex-row flex-col justify-center items-center gap-2 mt-12">
                                    <div
                                        key={1}
                                        className="bg-foreground/10 p-0.5 border rounded-[calc(var(--radius-xl)+0.125rem)]">
                                        <Button
                                            asChild
                                            size="lg"
                                            className="px-5 rounded-xl text-base">
                                            <Link href="#link">
                                                <span className="text-nowrap">Start Building</span>
                                            </Link>
                                        </Button>
                                    </div>
                                    <Button
                                        key={2}
                                        asChild
                                        size="lg"
                                        variant="ghost"
                                        className="px-5 rounded-xl h-10.5">
                                        <Link href="#link">
                                            <span className="text-nowrap">Request a demo</span>
                                        </Link>
                                    </Button>
                                </AnimatedGroup>
                            </div>
                        </div>

                        <AnimatedGroup
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.05,
                                            delayChildren: 0.75,
                                        },
                                    },
                                },
                                ...transitionVariants,
                            }}>
                            <div className="relative mt-8 sm:mt-12 md:mt-20 -mr-56 sm:mr-0 px-2 overflow-hidden">
                                <div
                                    aria-hidden
                                    className="z-10 absolute inset-0 bg-linear-to-b from-35% from-transparent to-background"
                                />
                                <div className="relative inset-shadow-2xs dark:inset-shadow-white/20 bg-background shadow-lg shadow-zinc-950/15 mx-auto p-4 border rounded-2xl ring-1 ring-background max-w-6xl overflow-hidden">
                                    <Image
                                        className="hidden dark:block relative bg-background rounded-2xl aspect-15/8"
                                        src="/mail2.png"
                                        alt="app screen"
                                        width="2700"
                                        height="1440"
                                    />
                                    <Image
                                        className="dark:hidden z-2 relative border border-border/25 rounded-2xl aspect-15/8"
                                        src="/mail2-light.png"
                                        alt="app screen"
                                        width="2700"
                                        height="1440"
                                    />
                                </div>
                            </div>
                        </AnimatedGroup>
                    </div>
                </section>
                <section className="bg-background pt-16 pb-16 md:pb-32">
                    <div className="group relative m-auto px-6 max-w-5xl">
                        <div className="z-10 absolute inset-0 flex justify-center items-center opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 duration-500">
                            <Link
                                href="/"
                                className="block hover:opacity-75 text-sm duration-150">
                                <span> Meet Our Customers</span>

                                <ChevronRight className="inline-block ml-1 size-3" />
                            </Link>
                        </div>
                        <div className="gap-x-12 gap-y-8 sm:gap-x-16 sm:gap-y-14 grid grid-cols-4 group-hover:opacity-50 group-hover:blur-xs mx-auto mt-12 max-w-2xl transition-all duration-500">
                            <div className="flex">
                                <img
                                    className="dark:invert mx-auto w-fit h-5"
                                    src="https://html.tailus.io/blocks/customers/nvidia.svg"
                                    alt="Nvidia Logo"
                                    height="20"
                                    width="auto"
                                />
                            </div>

                            <div className="flex">
                                <img
                                    className="dark:invert mx-auto w-fit h-4"
                                    src="https://html.tailus.io/blocks/customers/column.svg"
                                    alt="Column Logo"
                                    height="16"
                                    width="auto"
                                />
                            </div>
                            <div className="flex">
                                <img
                                    className="dark:invert mx-auto w-fit h-4"
                                    src="https://html.tailus.io/blocks/customers/github.svg"
                                    alt="GitHub Logo"
                                    height="16"
                                    width="auto"
                                />
                            </div>
                            <div className="flex">
                                <img
                                    className="dark:invert mx-auto w-fit h-5"
                                    src="https://html.tailus.io/blocks/customers/nike.svg"
                                    alt="Nike Logo"
                                    height="20"
                                    width="auto"
                                />
                            </div>
                            <div className="flex">
                                <img
                                    className="dark:invert mx-auto w-fit h-5"
                                    src="https://html.tailus.io/blocks/customers/lemonsqueezy.svg"
                                    alt="Lemon Squeezy Logo"
                                    height="20"
                                    width="auto"
                                />
                            </div>
                            <div className="flex">
                                <img
                                    className="dark:invert mx-auto w-fit h-4"
                                    src="https://html.tailus.io/blocks/customers/laravel.svg"
                                    alt="Laravel Logo"
                                    height="16"
                                    width="auto"
                                />
                            </div>
                            <div className="flex">
                                <img
                                    className="dark:invert mx-auto w-fit h-7"
                                    src="https://html.tailus.io/blocks/customers/lilly.svg"
                                    alt="Lilly Logo"
                                    height="28"
                                    width="auto"
                                />
                            </div>

                            <div className="flex">
                                <img
                                    className="dark:invert mx-auto w-fit h-6"
                                    src="https://html.tailus.io/blocks/customers/openai.svg"
                                    alt="OpenAI Logo"
                                    height="24"
                                    width="auto"
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}
