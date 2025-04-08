"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Cpu, TrendingUp } from "lucide-react"; // Using Cpu icon
import {
    Area,
    AreaChart,
    CartesianGrid,
    XAxis,
    YAxis,
    ReferenceLine,
    DotProps,
    ResponsiveContainer,
    Line // Import Line for custom dots
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Adjust path if needed
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"; // Adjust path if needed

// --- Original Data (Unchanged) ---
const aiPerformanceData = [
    { date: '2024-01-24', model: 'Grok-2', score: 5 },
    { date: '2024-04-24', model: 'ChatGPT-4 Omni', score: 5 },
    { date: '2024-09-24', model: 'OpenAI O1', score: 10 },
    { date: '2024-12-24', model: 'Gemini Thinking', score: 6 },
    { date: '2025-02-25', model: 'DeepSeek', score: 8 },
    { date: '2025-03-25', model: 'OpenAI O3 Mini', score: 9 },
    { date: '2025-04-04', model: 'O3 Mini High', score: 11 },
    { date: '2025-04-25', model: 'OpenAI Deep Research', score: 28 },
    { date: '2025-04-25', model: 'Blaze Deep Research', score: 33 } // Latest
];

// --- Chart Configuration (Corrected) ---
// ONLY define the actual data series here. Custom dot colors are handled separately.
const aiChartConfig = {
  score: {
    label: "AI Score",
    color: "hsl(var(--chart-1))", // This links to the CSS variable for the main series
    icon: Cpu,
  },
} satisfies ChartConfig; // Ensure this satisfies the type correctly now


// --- Custom Dot Component (Revised Props) ---
interface AiCustomDotProps extends Omit<DotProps, 'key'> {
  payload?: any;
  isClient: boolean;
  currentScore: number; // Still needed for logic if latest dot depends on live score visually
  baseColorVar: string; // The CSS variable name (e.g., '--chart-1')
}

const AiCustomDot: React.FC<AiCustomDotProps> = (props) => {
    const { cx, cy, payload, isClient, baseColorVar } = props;

    // State to hold the computed background color for stroke knockout
    const [backgroundColor, setBackgroundColor] = useState('transparent'); // Default transparent

    useEffect(() => {
        // Get the actual computed background color client-side
        if (isClient && typeof document !== 'undefined') {
            try {
                // Use a fallback if --background isn't set directly on root
                 const computedBg = getComputedStyle(document.documentElement).getPropertyValue('--background');
                 // Convert HSL string from CSS variable to a usable color value
                 // This is a basic parser, might need refinement based on actual HSL format
                 if (computedBg) {
                     const match = computedBg.trim().match(/^(\d+)\s+([\d.]+)%\s+([\d.]+)%$/);
                     if (match) {
                        setBackgroundColor(`hsl(${match[1]}, ${match[2]}%, ${match[3]}%)`);
                     } else {
                        // Fallback if it's not HSL numbers (e.g., it's already a color name or hex)
                        // Or if --background is not defined, use a sensible default based on theme pref
                         const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                         setBackgroundColor(prefersDark ? '#000000' : '#FFFFFF'); // Simple black/white fallback
                     }
                 } else {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    setBackgroundColor(prefersDark ? '#000000' : '#FFFFFF');
                 }

            } catch (error) {
                 console.error("Error getting background color CSS variable:", error);
                 // Use fallback on error
                 const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                 setBackgroundColor(prefersDark ? '#000000' : '#FFFFFF');
            }
        }
    }, [isClient]);


    if (typeof cx !== 'number' || typeof cy !== 'number' || !isClient || !payload) return null;

    const isLatest = payload?.model === 'Blaze Deep Research';
    const isHighScore = payload?.score >= 20 && !isLatest;

    // Define dot colors using the passed CSS variable name
    // Use `var()` syntax directly in inline styles/SVG attributes where supported
    const dotColor = `hsl(var(${baseColorVar}) / 0.6)`;
    const highlightColor = `hsl(var(${baseColorVar}))`;
    const latestColor = `hsl(var(${baseColorVar}))`; // Could use a --chart-1-vibrant if defined
    const latestGlow = `hsl(var(${baseColorVar}) / 0.15)`;

    if (isLatest) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={10} fill={latestGlow} className="animate-pulse" style={{ animationDuration: '1.8s' }} />
          <circle cx={cx} cy={cy} r={4.5} fill={latestColor} stroke={backgroundColor} strokeWidth={1.5} />
        </g>
      );
    }
    if (isHighScore) {
      return <circle cx={cx} cy={cy} r={4} fill={highlightColor} stroke={backgroundColor} strokeWidth={1.5} />;
    }
    return <circle cx={cx} cy={cy} r={2.5} fill={dotColor} />;
};


// --- Main Component ---
export function Hle() {
  const [currentScore, setCurrentScore] = useState(33.0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const data = useMemo(() => aiPerformanceData, []);

  useEffect(() => {
    if (!isClient) return;
    const interval = setInterval(() => {
      setCurrentScore(prev => {
        const newScore = prev + 0.1;
        return newScore > 36 ? 31 : parseFloat(newScore.toFixed(1));
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isClient]);

  const formatDate = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } catch (e) {
        return dateStr;
    }
  };
  const formatScore = (value: number) => `${value}%`;

  const latestDataPoint = data[data.length - 1];

  return (
    <Card className="shadow-sm hover:shadow-md mx-auto border-border/60 w-full max-w-3xl transition-shadow duration-300">
     <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-4">
   <div className="gap-1 grid">
      <CardTitle className="font-semibold text-foreground text-lg sm:text-xl tracking-tight">
         Humanity&apos;s Last Exam
      </CardTitle>
      <CardDescription className="text-muted-foreground text-xs sm:text-sm">
         Final Benchmark Challenges For AI Models
      </CardDescription>
   </div>

         {/* Live Score Indicator - Uses CSS variable --chart-1 for color */}
         <div className="flex items-center gap-2 bg-background/50 shadow-background/10 shadow-inner px-3 py-1 border border-border rounded-full">
           <span className="relative flex w-2 h-2">
              {/* Apply color using inline style referencing the CSS variable */}
             <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75`}
                style={{ backgroundColor: `hsl(var(--chart-1))` }}
             ></span>
             <span
                className={`relative inline-flex h-2 w-2 rounded-full`}
                style={{ backgroundColor: `hsl(var(--chart-1))` }}
             ></span>
           </span>
           <span className="mr-1 font-medium text-muted-foreground text-xs">Live:</span>
           {/* Apply color using inline style referencing the CSS variable */}
           <span
             className="font-semibold text-sm"
             style={{ color: `hsl(var(--chart-1))` }}
           >
             {isClient ? currentScore.toFixed(1) : latestDataPoint.score.toFixed(1)}%
           </span>
         </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-4 pt-0 pb-6">
        <div className="w-full h-64">
          {/* Use ChartContainer with the *corrected* config */}
          <ChartContainer config={aiChartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                accessibilityLayer
                data={data}
                margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                 />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  dataKey="score"
                  tickFormatter={formatScore}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                  tickMargin={5}
                  domain={[0, 'dataMax + 8']}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  allowDecimals={false}
                />
                <ReferenceLine
                    y={20}
                    stroke="hsl(var(--border))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                    label={{ value: 'Advanced', position: 'insideTopRight', fill: 'hsl(var(--muted-foreground))', fontSize: 9, dy: -4, dx: -10 }}
                 />
                <ChartTooltip
                  cursor={{ stroke: "hsl(var(--chart-1))", strokeWidth: 1, strokeOpacity: 0.3 }}
                  content={
                    <ChartTooltipContent
                        indicator="dot"
                        labelFormatter={(value) => formatDate(value)}
                        formatter={(value, name, item) => {
                            const dataPoint = item.payload;
                            const isLatest = dataPoint.model === 'Blaze Deep Research';
                            const displayScore = isLatest ? currentScore : dataPoint.score;
                            return (
                                <div className="flex flex-col gap-0.5">
                                   <span className="font-medium text-foreground">{dataPoint.model}</span>
                                   {/* Apply color using inline style */}
                                   <span className="text-muted-foreground">Score:
                                      <span className="font-semibold" style={{ color: 'hsl(var(--chart-1))' }}> {displayScore.toFixed(1)}%</span>
                                   </span>
                                </div>
                            );
                        }}
                    />
                    }
                />
                <Area
                  dataKey="score"
                  type="monotone"
                  fill="var(--color-score)" // Injected variable from config
                  fillOpacity={0.25}
                  stroke="var(--color-score)" // Injected variable from config
                  strokeWidth={2.5}
                   activeDot={{
                     r: 6,
                     fill: "hsl(var(--background))",
                     stroke: "var(--color-score)", // Use injected variable
                     strokeWidth: 2,
                   }}
                   dot={false} // Hide default area dots
                />

                {/* Invisible Line for custom dots */}
                {isClient && (
                   <Line
                     dataKey="score"
                     stroke="transparent"
                     fill="transparent"
                     isAnimationActive={false}
                     dot={(props) => (
                       <AiCustomDot
                         {...props}
                         isClient={isClient}
                         currentScore={currentScore}
                         // Pass the correct CSS variable name directly
                         baseColorVar="--chart-1"
                       />
                     )}
                     activeDot={false}
                   />
                )}

              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>

      <CardFooter className="pt-4 border-t border-border/60">
        <div className="w-full">
             <h3 className="mb-2 font-medium text-muted-foreground text-xs">Recent Models</h3>
             <div className="gap-2 sm:gap-3 grid grid-cols-3">
               {[...data].reverse().slice(0, 3).map((item) => (
                 <div key={item.model} className="bg-background/30 shadow-sm px-2 py-1.5 border border-border/70 rounded-md text-center">
                   <p className="font-medium text-[10px] text-foreground sm:text-xs truncate">{item.model}</p>
                   {/* Apply color using inline style */}
                   <p
                     className="mt-0.5 font-semibold text-sm"
                     style={{ color: 'hsl(var(--chart-1))' }}
                    >
                       {item.score}%
                   </p>
                 </div>
               ))}
             </div>
           </div>
      </CardFooter>
    </Card>
  );
}