
"use client";
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  DotProps // Keep DotProps for type safety
} from 'recharts';

// --- Modernized Theme Colors ---
// Using CSS variables defined in your global styles (tailwind config or globals.css)
// Assumes variables like --background, --foreground, --primary, --muted-foreground, --border exist.
// We'll add a vibrant variant assumption.
const colors = {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  primary: 'hsl(var(--primary))', // e.g., A strong Violet/Indigo
  primaryVibrant: 'hsl(var(--primary-vibrant, var(--primary)))', // A brighter shade for highlights/gradients
  primaryMuted: 'hsl(var(--primary) / 0.5)', // Softer primary for less emphasis
  primaryUltraMuted: 'hsl(var(--primary) / 0.1)', // Very soft for glows/backgrounds
  mutedForeground: 'hsl(var(--muted-foreground))', // For subtle text, ticks
  border: 'hsl(var(--border))', // Subtle borders, dividers
  borderHover: 'hsl(var(--primary) / 0.2)', // Border color on hover for interactive elements
  card: 'hsl(var(--card))', // Card background
  cardForeground: 'hsl(var(--card-foreground))', // Card text
};

// --- Main Component: Hle ---
const RechartsHle = () => {
  const [currentScore, setCurrentScore] = useState(33.0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Mount check for reliable rendering of SVG elements
  }, []);

  // Sample data (unchanged)
  const data = [
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

  // Live score update effect (unchanged)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScore(prev => {
        const newScore = prev + 0.1;
        // Simple loop back for demo purposes
        return newScore > 36 ? 31 : parseFloat(newScore.toFixed(1));
      });
    }, 150); // Slightly slower for smoother visual
    return () => clearInterval(interval);
  }, []);

  // Date formatting (unchanged)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  // --- Modernized Custom Tooltip ---
  interface CustomTooltipProps {
    active?: boolean; payload?: any[]; label?: string;
  }
  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
     if (active && payload && payload.length) {
      const dataPayload = payload.find(p => p.dataKey === 'score');
      if (!dataPayload) return null;

      const dataPoint = dataPayload.payload;
      const isLatest = dataPoint.model === 'Blaze Deep Research';
      const score = isLatest ? currentScore : dataPoint.score;

      return (
        <div className="bg-white/70 dark:bg-black/70 shadow-xl backdrop-blur-lg border border-white/10 dark:border-black/20 rounded-xl overflow-hidden">
           <div className="p-4">
              <div className="flex justify-between items-center gap-3 mb-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{dataPoint.model}</span>
                {isLatest && (
                   <span className="inline-flex items-center bg-primary/10 dark:bg-primary/20 px-2.5 py-0.5 rounded-full font-semibold text-[10px] text-primary dark:text-primary leading-none">
                      Live
                    </span>
                )}
              </div>
              <p className="mb-3 text-muted-foreground text-xs">{formatDate(dataPoint.date)}</p>
              <div className="flex items-baseline gap-1.5">
                 <span className="bg-clip-text bg-gradient-to-r from-primary via-primaryVibrant to-primary font-bold text-transparent text-3xl tracking-tight">
                   {score.toFixed(1)}
                 </span>
                 <span className="text-muted-foreground text-xs">% Score</span>
              </div>
           </div>
           {/* Optional: Add a subtle gradient bar at the bottom */}
           <div className="bg-gradient-to-r from-primary/30 via-primaryVibrant/40 to-primary/30 h-1"></div>
        </div>
      );
    }
    return null;
  };

  // --- Modernized Custom Dot ---
  interface CustomDotProps extends Omit<DotProps, 'key'> {
    payload?: any;
  }
  const CustomDot: React.FC<CustomDotProps> = (props) => {
    const { cx, cy, payload } = props;

    // Important: Render null server-side or before client mount to avoid hydration errors
    if (typeof cx !== 'number' || typeof cy !== 'number' || !isClient) return null;

    const isLatest = payload?.model === 'Blaze Deep Research';
    const isMajorMilestone = payload?.score >= 20 && !isLatest; // Example: Highlight significant points

    // Base dot style
    let dot = <circle cx={cx} cy={cy} r={3} fill={colors.primaryMuted} opacity={0.6} />;

    if (isMajorMilestone) {
      dot = <circle cx={cx} cy={cy} r={4} fill={colors.primary} stroke={colors.background} strokeWidth={1.5} />;
    }

    if (isLatest) {
      // Use SVG filter for a pronounced glow effect
      return (
        <g filter="url(#modernDotGlow)">
          {/* Pulsing outer ring */}
          <circle cx={cx} cy={cy} r={10} fill={colors.primaryVibrant} opacity={0.15} className="animate-pulse" style={{ animationDuration: '1.5s' }} />
          {/* Inner solid dot */}
          <circle cx={cx} cy={cy} r={5} fill={colors.primaryVibrant} stroke={colors.background} strokeWidth={2} />
        </g>
      );
    }

    return dot;
  };


  // --- Main Component Render ---
  return (
    // --- Modernized Container ---
    <div className="bg-background dark:bg-gradient-to-br dark:from-gray-950 dark:via-black dark:to-black/90 shadow-slate-200/50 shadow-xl dark:shadow-black/30 mx-auto p-6 md:p-8 border dark:border-white/5 border-black/5 rounded-2xl w-full max-w-4xl font-sans text-foreground">

      {/* --- Modernized Header --- */}
      <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="font-semibold text-foreground text-xl tracking-tight">AI Performance</h2>
          <p className="mt-1 text-muted-foreground text-sm">Model Intelligence Score Over Time</p>
        </div>
        {/* --- Modernized Live Score Indicator --- */}
        <div className="flex items-center gap-2 bg-primaryUltraMuted dark:bg-primary/10 px-4 py-2 border border-primary/10 dark:border-primary/20 rounded-full">
           {/* Simple animated dot */}
           <span className="relative flex w-2.5 h-2.5">
             <span className="inline-flex absolute bg-primary/70 opacity-75 rounded-full w-full h-full animate-ping"></span>
             <span className="inline-flex relative bg-primary rounded-full w-2.5 h-2.5"></span>
           </span>
           <span className="mr-1 font-medium text-primary/90 dark:text-primary/90 text-xs">Live Score:</span>
           <span className="bg-clip-text bg-gradient-to-r from-primary via-primaryVibrant to-primary font-bold text-transparent text-base">
             {currentScore.toFixed(1)}%
            </span>
        </div>
      </div>

      {/* --- Chart Container --- */}
      <div className="w-full h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
            <defs>
              {/* 1. Gradient for the main, sharp foreground line */}
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.primaryVibrant} />
                <stop offset="50%" stopColor={colors.primary} />
                <stop offset="100%" stopColor={colors.primaryVibrant} />
              </linearGradient>

              {/* 2. Gradient for the underlying, soft background stroke/glow */}
              <linearGradient id="backgroundStrokeGradient" x1="0" y1="0" x2="0" y2="1">
                  {/* Adjusted for a vertical fade, often looks softer */}
                  <stop offset="0%" stopColor={colors.primary} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity={0.05} />
              </linearGradient>

              {/* 3. Gradient for the subtle area fill */}
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.primary} stopOpacity={0.15} />
                <stop offset="80%" stopColor={colors.primary} stopOpacity={0.0} />
              </linearGradient>

              {/* 4. SVG Filter for Background Line Blur (Glow Effect) */}
              <filter id="lineBlur" x="-50%" y="-50%" width="200%" height="200%">
                 <feGaussianBlur stdDeviation="5" result="blurredLine" />
              </filter>

              {/* 5. SVG Filter for the Live Dot Glow */}
              <filter id="modernDotGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                 <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                 </feMerge>
              </filter>

            </defs>

            {/* --- Axes Configuration (Minimalist) --- */}
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              axisLine={false}
              tickLine={false}
              tick={{ fill: colors.mutedForeground, fontSize: 11, fontFamily: 'inherit' }}
              dy={10} // Push ticks down slightly
              interval="preserveStartEnd" // Ensure start/end labels
              padding={{ left: 10, right: 10 }} // Add padding to prevent clipping
             />
            <YAxis
              tickFormatter={(value) => `${value}%`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: colors.mutedForeground, fontSize: 11, fontFamily: 'inherit' }}
              domain={[0, 'dataMax + 8']} // Add some headroom
              width={35} // Allocate space for labels
              dx={-5} // Push ticks left slightly
            />

            {/* --- Reference Line (Subtle) --- */}
            <ReferenceLine
              y={20}
              stroke={colors.border}
              strokeDasharray="3 3"
              strokeOpacity={0.6}
              label={{ value: 'Advanced Tier', position: 'insideTopRight', fill: colors.mutedForeground, fontSize: 9, fontFamily: 'inherit', dy: -6, dx: -10 }}
             />

            {/* --- Tooltip --- */}
            <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: colors.border, strokeDasharray: '4 4', strokeOpacity: 0.5 }}
                animationDuration={200} // Faster tooltip animation
                />

            {/* --- Area Fill (Subtle) --- */}
            <Area
              type="monotone"
              dataKey="score"
              stroke="none" // No border for the area itself
              fill="url(#areaGradient)"
              isAnimationActive={true}
              animationDuration={1500}
             />

             {/* === BACKGROUND STROKE LINE (Rendered FIRST for layering) === */}
            <Line
              type="monotone"
              dataKey="score" // Use the same data
              stroke="url(#backgroundStrokeGradient)" // Use the dedicated soft gradient
              strokeWidth={18} // Significantly thicker
              strokeLinecap="round" // Rounded ends look softer
              strokeLinejoin="round"
              filter="url(#lineBlur)" // Apply the blur filter for the glow
              dot={false} // No dots on the background line
              activeDot={false} // No interaction needed
              isAnimationActive={true}
              animationDuration={1800} // Slightly slower animation for effect
              />

            {/* === FOREGROUND DATA LINE (Rendered SECOND, on top) === */}
            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#lineGradient)" // Use the sharp, vibrant gradient
              strokeWidth={3} // Crisp and clear, but not too thick
              strokeLinecap="round"
              dot={(props) => {
                // Need to strip 'key' before passing to CustomDot if it causes issues
                const { key, ...restProps } = props;
                return <CustomDot key={JSON.stringify(restProps.payload)} {...restProps} />; // Use a more stable key
              }}
              activeDot={(props: any) => { // Style the dot shown on hover
                const { cx, cy } = props;
                if (typeof cx !== 'number' || typeof cy !== 'number') return null;
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={8} stroke={colors.primaryVibrant} strokeWidth={2} fill={colors.background} />
                    <circle cx={cx} cy={cy} r={4} fill={colors.primaryVibrant} />
                  </g>
                );
              }}
              isAnimationActive={true}
              animationDuration={1200} // Standard animation speed
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* --- Modernized Footer / Milestones Section --- */}
       <div className="mt-8 pt-6 dark:border-white/5 border-t border-black/5">
         <h3 className="mb-4 font-medium text-muted-foreground text-sm">Recent Milestones</h3>
         <div className="gap-3 md:gap-4 grid grid-cols-2 md:grid-cols-3">
           {/* Map last 3 data points */}
           {[...data].reverse().slice(0, 3).map((item) => (
             <div
               key={item.model}
               className="group bg-white hover:bg-gray-50/80 dark:bg-gray-950/50 dark:hover:bg-gray-900/70 shadow-sm hover:shadow-md p-4 border hover:border-primary/20 dark:border-white/10 dark:hover:border-primary/30 border-black/5 rounded-xl transition-all duration-200 cursor-default"
              >
               <p className="mb-1 font-semibold text-foreground group-hover:text-primary text-xs truncate transition-colors">{item.model}</p>
               <p className="bg-clip-text bg-gradient-to-r from-primary via-primaryVibrant to-primary mb-1.5 font-bold text-transparent text-xl">
                 {item.score}%
               </p>
               <p className="text-[10px] text-muted-foreground">{formatDate(item.date)}</p>
             </div>
           ))}
         </div>
       </div>
    </div>
  );
};

export default RechartsHle;