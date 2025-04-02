import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const Page = () => {
  return (
    <div className="flex flex-col justify-center items-center h-screen gap-6">
      <div className="text-5xl font-serif font-bold">Welcome to my landing page!</div>
      <Link href="/main">
        <Button>Get Started for free</Button>
      </Link>
    </div>
  )
}

export default Page