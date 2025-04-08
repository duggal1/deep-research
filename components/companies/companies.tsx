
"use client"

import Images from "@/app/(Marketing)/components/Svgs/svg";
import { Sparkles } from "./particles";
import { InfiniteSlider } from "./motion-scroll";
import { useTheme } from "next-themes";
import Container from "../global/Contanier";



const logos = [
  {
    id: "company1",
    component: Images.company1,
  },
  {
    id: "company2",
    component: Images.company2,
  },
  {
    id: "company3",
    component: Images.company3,
  },
  {
    id: "company6",
    component: Images.company6,
  },
  {
    id: "company7",
    component: Images.company7,
  },
  {
    id: "company9",
    component: Images.company9,
  },
  {
    id: "company10",
    component: Images.company10,
  },
  {
    id: "company4",
    component: Images.company4,
  },
  {
    id: "company5",
    component: Images.company5,
  },
  {
    id: "company8",
    component: Images.company8,
  }
]

export default function Companies() {
    const { theme } = useTheme()
  return (
    <Container delay={0.05}>
    <div className="w-full h-screen overflow-hidden">
      <div className="mx-auto mt-32 w-full max-w-2xl">
      <div className="flex flex-col justify-center items-center">
        <h1 className="flex flex-col justify-center items-center font-serif font-black text-5xl md:text-5xl lg:text-5xl text-center tracking-tight">
          <span className="block justify-center items-center mb-2 text-neutral-800 dark:text-neutral-50">
            Trusted by industry leaders.
          </span>
          <span className="inline-block justify-center items-center text-neutral-800 dark:text-neutral-50 leading-tight tracking-tight">
            Used by the CEOS.
          </span>
        </h1>
        </div>

        <div className="relative mt-7 w-full h-[100px]">
          <InfiniteSlider
            className='flex items-center w-full h-full'
            duration={50}  // Increased duration for smoother animation
            gap={48}
          >
            {logos.map(({ id, component: Logo }) => (



              <div
                key={id}
                className="flex justify-center items-center"
              >
                <Logo width={120} height={40} className="w-24 h-8" />
              </div>
            ))}
            </InfiniteSlider>
          {/* <ProgressiveBlur
            className='top-0 left-0 absolute w-[200px] h-full pointer-events-none'
            direction='left'
            blurIntensity={1}
          />
          <ProgressiveBlur
            className='top-0 right-0 absolute w-[200px] h-full pointer-events-none'
            direction='right'
            blurIntensity={1}
          /> */}
        </div>
      </div>
     

      <div className="relative -mt-32 w-full h-96 overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)]">
      <div className="absolute before:absolute inset-0 before:inset-0 before:bg-[radial-gradient(circle_at_bottom_center,#2563eb,#0ea5e9,transparent_70%)] before:opacity-40" />

        <div className="top-1/2 -left-1/2 z-10 absolute bg-white dark:bg-black shadow-[0_-40px_80px_rgba(79,70,229,0.5)] border-zinc-100/30 dark:border-zinc-900/90 rounded-[100%] w-[200%] aspect-[1/0.7]">
        <div className="absolute inset-0 shadow-inner-[0_-10px_30px_rgba(0,0,0,0.4)] rounded-[100%]"></div>
        </div>
        <Sparkles
          density={1200}
          className="bottom-0 absolute inset-x-0 w-full h-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]"
          color={theme === "dark" ? "#ffffff" : "#000000"}
        />
      </div>
      </div>
      </Container>

  )
}



