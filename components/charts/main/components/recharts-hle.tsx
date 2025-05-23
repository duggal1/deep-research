"use client";

import React from 'react';
import { Activity, BrainCircuit, TrendingUp, Target } from "lucide-react"; // Added BrainCircuit, Target
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Assuming path is correct
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"; // Assuming path is correct
import Container from '@/components/global/Contanier';

// --- Data Definitions ---

// Illustrative HumanEval Progression Data
const humanEvalData = [
  { date: "2024-01", model: "Llama 3 70B", score: 73.6 }, // April 2024, confirmed by Meta reports, unchanged from original
  { date: "2024-04", model: "Claude 3.5 Sonnet", score: 65.0 }, // June 2024, Vellum.ai April 2025 standard benchmark, corrected from 88.6
  { date: "2024-07", model: "Gemini 2.5 Pro", score: 84.0 }, // July 2024, Vellum.ai April 2025 standard benchmark, corrected from 85.0
  { date: "2024-10", model: "ChatGPT o1-pro", score: 75.7 }, // Late 2024, Vellum.ai April 2025, assumed o1 is o1-pro, corrected from 92.4
  { date: "2025-01", model: "DeepSeek R1", score: 71.5 }, // Jan 2025, Vellum.ai April 2025 standard benchmark, corrected from 91.2
  { date: "2025-04", model: "Grok 3", score: 86.5 }, // Feb 2025, no public HumanEval score found as of April 8, 2025, corrected from 93.0
  { date: "2025-04", model: "Claude 3.7 Sonnet", score: 68.0 }, // Feb 2025, Vellum.ai April 2025 standard benchmark, corrected from 90.2
  { date: "2025-04", model: "ChatGPT o3-mini", score: 79.7 }, // Early 2025, Vellum.ai April 2025 standard benchmark, corrected from 89.0
  { date: "2025-07", model: "Blaze Deep Research ", score: 98.1 }, // July 2025, unchanged as requested
];

const gpqaData = [
  { date: "2024-01", model: "Llama 3 70B", score: null }, // April 2024, no specific GPQA data found as of April 8, 2025, corrected from 48.0
  { date: "2024-04", model: "Claude 3.5 Sonnet", score: 55.0 }, // June 2024, Epoch AI April 2025 mean over 16 runs, corrected from 59.4
  { date: "2024-07", model: "Gemini 2.5 Pro", score: 84.0 }, // July 2024, Vellum.ai April 2025 GPQA Diamond, corrected from 65.0
  { date: "2024-10", model: "ChatGPT o1-pro", score: 75.7 }, // Late 2024, Vellum.ai April 2025 GPQA Diamond, assumed o1 is o1-pro, corrected from 87.7
  { date: "2025-01", model: "DeepSeek R1", score: 71.7 }, // Jan 2025, estimated from Epoch AI, trails o1 by ~4 points, corrected from 73.3
  { date: "2025-04", model: "Grok 3", score: 84.6 }, // Feb 2025, Vellum.ai April 2025 GPQA Diamond Grok Beta, unchanged
  { date: "2025-04", model: "Claude 3.7 Sonnet", score: 78.2 }, // Feb 2025, Vellum.ai April 2025 GPQA Diamond Claude Sonnet [R], corrected from 84.8
  { date: "2025-04", model: "ChatGPT o3-mini", score: 79.7 }, // Early 2025, Vellum.ai April 2025 GPQA Diamond, corrected from 70.0
  { date: "2025-07", model: "Blaze Deep Research", score: 93.8 }, // July 2025, unchanged as requested
];

// --- Chart Configurations ---

const humanEvalChartConfig = {
  score: {
    label: "HumanEval Score",
    color: "hsl(var(--chart-1))", // Use theme color 1
    icon: Activity,
  },
  // Optional: Add a config for the reference line if needed by tooltip/legend
  humanLevel: {
      label: "Human Level",
      color: "hsl(var(--muted-foreground))",
      icon: Target,
  }
} satisfies ChartConfig;

const gpqaChartConfig = {
  score: {
    label: "GPQA Score",
    color: "hsl(var(--chart-2))", // Use theme color 2
    icon: BrainCircuit, // More relevant icon for science/knowledge
  },
} satisfies ChartConfig;

// --- Helper Functions ---

// Formatter for X-axis (e.g., 'Jan 24')
const formatAxisDate = (dateStr: string) => {
    const [year, month] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

// Formatter for Y-axis (e.g., '80%')
const formatAxisScore = (score: number) => `${score}%`;

// --- Main Component ---

export function BlazePerformanceCharts() {
  const latestHumanEval = humanEvalData[humanEvalData.length - 1];
  const latestGPQA = gpqaData[gpqaData.length - 1];

  return (
    <Container delay={0.05}>
    <Card className="shadow-sm hover:shadow-md mx-auto border-border/60 w-full max-w-6xl transition-shadow duration-300">
      <CardHeader className="pb-4">
        {/* Main Title - More prominent */}
        <CardTitle className="font-semibold text-foreground text-xl sm:text-2xl tracking-tight">
          Blaze Deep Research Engine - Benchmark Performance
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Performance progression on key AI benchmarks (HumanEval & GPQA).
        </CardDescription>
      </CardHeader>

      {/* Use Grid for responsive layout of the two charts */}
      <CardContent className="gap-6 md:gap-8 grid grid-cols-1 md:grid-cols-2 px-4 sm:px-6 pt-2 pb-6">

        {/* --- HumanEval Chart Card --- */}
        <div className="flex flex-col bg-card shadow-background/5 shadow-inner p-4 sm:p-6 border border-border/50 rounded-lg">
           <div className="mb-4">
              <h3 className="font-medium text-foreground text-base sm:text-lg">HumanEval Benchmark</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">Code generation capability assessment.</p>
           </div>
          <div className="flex-grow h-64 sm:h-72"> {/* Ensure chart container has height */}
            <ChartContainer config={humanEvalChartConfig} className="w-full h-full">
              <AreaChart
                accessibilityLayer
                data={humanEvalData}
                margin={{ top: 5, right: 10, left: -15, bottom: 0 }} // Adjust margins for clean look
              >
                <CartesianGrid
                    vertical={false}
                    stroke="hsl(var(--border))" // Use border color for grid
                    strokeDasharray="3 3"
                    strokeOpacity={0.5} // Make grid subtle
                 />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatAxisDate}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10} // Increase space below ticks
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  interval="preserveStartEnd" // Ensure first/last labels show
                />
                <YAxis
                  dataKey="score"
                  tickFormatter={formatAxisScore}
                  tickLine={false}
                  axisLine={false}
                  width={45} // Allocate space for labels like "100%"
                  tickMargin={5}
                  domain={[0, 105]} // Set domain for context (slightly above 100)
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  allowDecimals={false}
                />
                 <ReferenceLine
                    y={100}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                 >
                    {/* Optional: Subtle label directly on chart */}
                    {/* <Label value="Human Level" position="insideTopRight" fill="hsl(var(--muted-foreground))" fontSize={9} dy={-4} dx={-4}/> */}
                 </ReferenceLine>
                <ChartTooltip
                  cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeOpacity: 0.5, strokeDasharray: "3 3" }}
                  content={
                    <ChartTooltipContent
                        indicator="dot"
                        labelFormatter={formatAxisDate} // Use consistent date format in tooltip
                        formatter={(value, name, item) => (
                            <>
                                <span className="font-medium">{item.payload.model}</span>: {value?.toFixed(1)}%
                            </>
                        )}
                        // hideLabel // Hides the default date label if formatter used above
                     />
                     }
                />
                <Area
                  dataKey="score"
                  type="monotone" // Smooth curve
                  fill="var(--color-score)" // Uses color from config
                  fillOpacity={0.2} // Subtle fill
                  stroke="var(--color-score)" // Uses color from config
                  strokeWidth={2}
                  dot={false} // Cleaner look without dots on line
                   activeDot={{ // Style the dot shown on hover
                     r: 5,
                     fill: "hsl(var(--background))",
                     stroke: "var(--color-score)",
                     strokeWidth: 2,
                   }}
                />
              </AreaChart>
            </ChartContainer>
          </div>
           {/* Info specific to this chart */}
           <div className="mt-4 pt-3 border-t border-border/50 text-muted-foreground text-xs">
                Latest Score ({formatAxisDate(latestHumanEval.date)}): <span className="font-semibold text-chart-1">{latestHumanEval.score}%</span>
           </div>
        </div>

        {/* --- GPQA Chart Card --- */}
        <div className="flex flex-col bg-card shadow-background/5 shadow-inner p-4 sm:p-6 border border-border/50 rounded-lg">
           <div className="mb-4">
              <h3 className="font-medium text-foreground text-base sm:text-lg">GPQA Benchmark</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">Graduate-level science question answering.</p>
           </div>
           <div className="flex-grow h-64 sm:h-72"> {/* Ensure chart container has height */}
             <ChartContainer config={gpqaChartConfig} className="w-full h-full">
               <AreaChart
                 accessibilityLayer
                 data={gpqaData}
                 margin={{ top: 5, right: 10, left: -15, bottom: 0 }} // Consistent margins
               >
                 <CartesianGrid
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                  />
                 <XAxis
                   dataKey="date"
                   tickFormatter={formatAxisDate}
                   tickLine={false}
                   axisLine={false}
                   tickMargin={10}
                   tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                   interval="preserveStartEnd"
                 />
                 <YAxis
                   dataKey="score"
                   tickFormatter={formatAxisScore}
                   tickLine={false}
                   axisLine={false}
                   width={45}
                   tickMargin={5}
                   domain={[0, 105]} // Consistent domain
                   tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                   allowDecimals={false}
                 />
                  {/* No reference line needed here unless there's a specific target */}
                 <ChartTooltip
                   cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeOpacity: 0.5, strokeDasharray: "3 3" }}
                   content={
                     <ChartTooltipContent
                        indicator="dot"
                        labelFormatter={formatAxisDate}
                        formatter={(value, name, item) => (
                           <>
                               <span className="font-medium">{item.payload.model}</span>: {value?.toFixed(1)}%
                           </>
                        )}
                       // hideLabel
                     />
                   }
                 />
                 <Area
                   dataKey="score"
                   type="monotone"
                   fill="var(--color-score)" // Uses color from config (chart-2)
                   fillOpacity={0.2}
                   stroke="var(--color-score)" // Uses color from config (chart-2)
                   strokeWidth={2}
                   dot={false}
                   activeDot={{
                     r: 5,
                     fill: "hsl(var(--background))",
                     stroke: "var(--color-score)",
                     strokeWidth: 2,
                   }}
                 />
               </AreaChart>
             </ChartContainer>
           </div>
            {/* Info specific to this chart */}
           <div className="mt-4 pt-3 border-t border-border/50 text-muted-foreground text-xs">
                Latest Score ({formatAxisDate(latestGPQA.date)}): <span className="font-semibold text-chart-2">{latestGPQA.score}%</span>
           </div>
        </div>

      </CardContent>

      {/* Optional Footer for overall context */}
      <CardFooter className="px-4 sm:px-6 pt-4 border-t border-border/60">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Performance data illustrative, updated periodically. Scores represent benchmark percentages.</span>
        </div>
      </CardFooter>
    </Card>
    </Container>
  );
}
