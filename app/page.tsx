import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-80px)] px-4 py-16">
      <div className="max-w-4xl mx-auto text-center space-y-12">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Discover deeper insights with <span className="text-primary">Blaze Research</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Our AI-powered research engine helps you explore topics more thoroughly,
          find connections, and generate comprehensive reports in minutes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/signup">
            <Button size="lg" className="px-8">Get Started</Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="px-8">Learn More</Button>
          </Link>
        </div>
      </div>

      <div id="features" className="mt-24 w-full max-w-6xl">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Deep Research",
              description: "Our AI autonomously explores the web to find relevant information on your topic."
            },
            {
              title: "Smart Analysis",
              description: "Automatically organize and connect information from multiple sources."
            },
            {
              title: "Comprehensive Reports",
              description: "Generate well-structured reports with citations in minutes, not hours."
            }
          ].map((feature, i) => (
            <div key={i} className="border rounded-lg p-6 bg-card">
              <h3 className="text-xl font-medium mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div id="pricing" className="mt-24 w-full max-w-6xl">
        <h2 className="text-3xl font-bold text-center mb-12">Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Basic",
              price: "Free",
              features: ["5 researches per month", "Basic report generation", "Email support"]
            },
            {
              title: "Pro",
              price: "$19/month",
              features: ["50 researches per month", "Advanced report formats", "Priority support", "Export to multiple formats"]
            },
            {
              title: "Enterprise",
              price: "Contact us",
              features: ["Unlimited researches", "Custom integrations", "Dedicated support", "Team collaboration"]
            }
          ].map((plan, i) => (
            <div key={i} className="border rounded-lg p-6 bg-card flex flex-col">
              <h3 className="text-xl font-medium mb-2">{plan.title}</h3>
              <p className="text-3xl font-bold mb-4">{plan.price}</p>
              <ul className="space-y-2 mb-6 flex-grow">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center">
                    <span className="mr-2">✓</span> {feature}
                  </li>
                ))}
              </ul>
              <Button variant={i === 1 ? "default" : "outline"} className="w-full">
                {i === 2 ? "Contact Sales" : "Get Started"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div id="about" className="mt-24 w-full max-w-6xl mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">About Blaze Research</h2>
        <p className="text-lg text-center max-w-3xl mx-auto">
          Blaze Research was founded with a mission to make deep research accessible to everyone.
          Our team of AI experts and researchers have built a platform that combines the power of
          artificial intelligence with the depth of human curiosity.
        </p>
      </div>
    </div>
  )
}