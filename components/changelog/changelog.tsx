import React from "react";
import { Timeline } from "@/components/ui/timeline";
import Container from "../global/Contanier";

export default function Timelines() {
  const data = [
    {
      title: "January 2025",
      content: (
        <div className="font-serif">
          <p className="mb-4 font-normal text-neutral-800 dark:text-neutral-200 text-xs md:text-sm">
            Initiated the MVP of Blaze — a deep research engine designed to intelligently fetch, analyze, and surface verified knowledge from the web.
          </p>
          <p className="font-normal text-neutral-800 dark:text-neutral-200 text-xs md:text-sm">
            Started building the foundational backend infrastructure with scraping, vector storage, and citation tracing capabilities.
          </p>
        </div>
      ),
    },
    {
      title: "February 2025",
      content: (
        <div className="font-serif">
          <p className="mb-4 font-normal text-neutral-800 dark:text-neutral-200 text-xs md:text-sm">
            Released internal alpha of Blaze — capable of querying multiple sources with basic context preservation.
          </p>
          <p className="font-normal text-neutral-800 dark:text-neutral-200 text-xs md:text-sm">
            Integrated semantic search and source-quality scoring to prioritize credible content.
          </p>
        </div>
      ),
    },
    {
      title: "March 2025",
      content: (
        <div className="font-serif">
          <p className="mb-4 font-normal text-neutral-800 dark:text-neutral-200 text-xs md:text-sm">
            Deployed Blaze Beta with:
          </p>
          <ul className="space-y-1 ml-4 font-normal text-neutral-800 dark:text-neutral-200 text-xs md:text-sm list-disc">
            <li>Boosted source crawling accuracy using domain-specific heuristics</li>
            <li>Added initial version of Blaze Reasoner (v1) — a model for summarizing and fact-checking results</li>
            <li>Implemented session-based memory to retain context across research threads</li>
          </ul>
        </div>
      ),
    },
    {
      title: "April 2025",
      content: (
        <div className="font-serif">
          <p className="mb-4 font-normal text-neutral-800 dark:text-neutral-200 text-xs md:text-sm">
            As of April 6, 2025 — Blaze now powers live deep research queries with:
          </p>
          <ul className="space-y-1 ml-4 font-normal text-neutral-800 dark:text-neutral-200 text-xs md:text-sm list-disc">
            <li>Realtime source ranking and live web data integration</li>
            <li>Advanced Blaze Reasoner v2 with argument synthesis and contradiction detection</li>
            <li>Full-text traceability for every citation in the final answer</li>
            <li>Contextual follow-up system (auto-suggested sub-questions)</li>
            <li>Currently scoring 32% on humanity&apos;s last exam, with projections reaching 41.2% soon</li>
          </ul>
        </div>
      ),
    },
    {
      title: "Coming Soon 🚧",
      content: (
        <div className="font-serif">
          <p className="mb-4 font-normal text-neutral-800 dark:text-neutral-200 text-xs md:text-sm">
            Upcoming features and improvements for Blaze include:
          </p>
          <ul className="space-y-1 ml-4 font-normal text-neutral-800 dark:text-neutral-200 text-xs md:text-sm list-disc">
            <li>Enhanced multi-language support for global research capabilities</li>
            <li>Blaze Reasoner v3 with improved reasoning and predictive analytics</li>
            <li>Integration with external APIs for real-time data enrichment</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
        <Container delay={0.1}>
    <div className="w-full">
      <Timeline data={data} />
    </div>
    </Container>
  );
}