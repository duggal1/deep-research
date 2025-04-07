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
  DotProps
} from 'recharts';

// --- Theme Colors (Ensure these match your globals.css or Tailwind config) ---
const colors = {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  primary: 'hsl(var(--primary))', // Main accent (e.g., Violet)
  primaryMuted: 'hsl(var(--primary) / 0.7)', // Slightly muted primary
  primaryVibrant: 'hsl(var(--primary-vibrant, var(--primary)))', // A potentially brighter variant
  primaryUltraMuted: 'hsl(var(--primary) / 0.25)', // Very soft for bg stroke/glow
  mutedForeground: 'hsl(var(--muted-foreground))', // Subtle text/ticks
  border: 'hsl(var(--border))',             // Subtle borders
  white: '#FFFFFF',
  black: '#000000',
};

const getPrimaryWithOpacity = (opacity: number) => `hsl(var(--primary) / ${opacity})`;
const getVibrantWithOpacity = (opacity: number) => `hsl(var(--primary-vibrant, var(--primary)) / ${opacity})`;


const Hle = () => {
  const [currentScore, setCurrentScore] = useState(33.0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sample data (kept the same)
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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScore(prev => {
        const newScore = prev + 0.1;
        return newScore > 36 ? 31 : parseFloat(newScore.toFixed(1));
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  // --- Custom Tooltip (Keep refined style) ---
  interface CustomTooltipProps {
    active?: boolean; payload?: any[]; label?: string;
  }
  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
     if (active && payload && payload.length) {
      // Ensure we read from the *correct* payload entry if multiple lines exist
      const dataPayload = payload.find(p => p.dataKey === 'score'); // Find payload for the main line
      if (!dataPayload) return null; // Should not happen if configured correctly

      const dataPoint = dataPayload.payload;
      const isLatest = dataPoint.model === 'Blaze Deep Research';
      const score = isLatest ? currentScore : dataPoint.score;

      return (
        <div className="bg-white/70 dark:bg-black/70 shadow-xl backdrop-blur-md p-3 border dark:border-white/10 border-black/10 rounded-lg overflow-hidden font-serif text-sm">
          <div className="flex justify-between items-center gap-2 mb-1.5">
            <span className="font-semibold text-gray-900 dark:text-gray-50">{dataPoint.model}</span>
            {isLatest && (
              <span className="bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-full font-medium text-[10px] text-primary dark:text-primary">Latest</span>
            )}
          </div>
          <p className="mb-2 text-muted-foreground text-xs">{formatDate(dataPoint.date)}</p>
          <div className="flex items-baseline gap-1">
             <span className="bg-clip-text bg-gradient-to-r from-primary via-primary-vibrant to-primary-muted font-bold text-transparent text-2xl">
               {score.toFixed(1)}
             </span>
             <span className="text-muted-foreground text-xs">% Score</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // --- Custom Dot (Keep enhanced style) ---
  interface CustomDotProps extends Omit<DotProps, 'key'> {
    payload?: any;
  }

  const CustomDot: React.FC<CustomDotProps> = (props) => {
    const { cx, cy, payload } = props;
    if (typeof cx !== 'number' || typeof cy !== 'number' || !isClient) return null;

    const isLatest = payload?.model === 'Blaze Deep Research';
    const isHighScore = payload?.score >= 20 && !isLatest;
    const primaryColor = colors.primary;
    const vibrantColor = colors.primaryVibrant;
    const backgroundColor = colors.background;

    if (isLatest) {
      return (
        <g filter="url(#dotGlow)">
          <circle cx={cx} cy={cy} r={10} fill={getVibrantWithOpacity(0.1)} className="animate-ping" style={{ animationDuration: '1.8s' }} />
          <circle cx={cx} cy={cy} r={7} fill={getVibrantWithOpacity(0.15)} />
          <circle cx={cx} cy={cy} r={4.5} fill={vibrantColor} stroke={backgroundColor} strokeWidth={1.5} />
        </g>
      );
    }
    if (isHighScore) {
      return <circle cx={cx} cy={cy} r={4} fill={primaryColor} stroke={backgroundColor} strokeWidth={1.5} />;
    }
    return <circle cx={cx} cy={cy} r={2.5} fill={getPrimaryWithOpacity(0.6)} />;
  };


  // --- Main Component Render ---
  return (
    <div className="bg-gradient-to-br from-white dark:from-gray-900 via-white dark:via-gray-900 to-gray-50/50 dark:to-black shadow-lg p-4 border dark:border-white/5 border-black/5 rounded-xl w-full font-serif">
      {/* Header Section - More compact and modern */}
      <div className="flex flex-row justify-between items-center mb-4">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">AI Performance Metrics</h2>
          <p className="mt-0.5 text-muted-foreground text-xs">Intelligence Score Evolution</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/5 dark:bg-primary/10 px-3 py-1 border border-primary/10 dark:border-primary/20 rounded-full">
           <span className="relative flex w-2 h-2"><span className="inline-flex absolute bg-primary/70 opacity-75 rounded-full w-full h-full animate-ping"></span><span className={`relative inline-flex rounded-full h-2 w-2 bg-primary`}></span></span>
           <span className="font-medium text-primary/90 dark:text-primary/90 text-xs">Live:</span>
           <span className="bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500 font-bold text-transparent text-base">{currentScore.toFixed(1)}%</span>
        </div>
      </div>

      {/* Chart Container - Reduced height */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
            <defs>
              {/* Gradient for the sharp foreground line */}
              <linearGradient id="modernLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.primaryVibrant} />
                <stop offset="50%" stopColor={colors.primary} />
                <stop offset="100%" stopColor={colors.primaryVibrant} />
              </linearGradient>

              {/* Enhanced Gradient for the underlying background stroke */}
              <linearGradient id="backgroundStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.15} />
                  <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.15} />
              </linearGradient>

              {/* Enhanced Area Fill Gradient */}
              <linearGradient id="modernAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
              </linearGradient>

              {/* SVG Filter for Dot Glow (Keep) */}
              <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>

              {/* SVG Filter for Background Stroke Blur (Optional) */}
              <filter id="lineBlur" x="-50%" y="-50%" width="200%" height="200%">
                 <feGaussianBlur stdDeviation="3" result="blurredLine" /> {/* Adjust stdDeviation for more/less blur */}
              </filter>

            </defs>

            {/* Axes and Reference Line (Keep minimal) */}
            <XAxis dataKey="date" tickFormatter={formatDate} axisLine={false} tickLine={false} tick={{ fill: colors.mutedForeground, fontSize: 11, fontFamily: 'inherit' }} dy={10} interval="preserveStartEnd" />
            <YAxis tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: colors.mutedForeground, fontSize: 11, fontFamily: 'inherit' }} domain={[0, 'dataMax + 5']} width={40} />
            <ReferenceLine y={20} stroke={colors.border} strokeDasharray="2 2" label={{ value: 'Advanced', position: 'insideTopRight', fill: colors.mutedForeground, fontSize: 10, fontFamily: 'inherit', dy: -5, dx: -10 }} />

            {/* Tooltip (Adjusted payload logic in component) */}
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: colors.border, strokeDasharray: '4 4' }} />

            {/* Area Fill (Subtle) */}
            <Area type="monotone" dataKey="score" stroke="none" fill="url(#modernAreaGradient)" />

             {/* =============================================== */}
            {/* == ENHANCED BACKGROUND STROKE LINE (Rendered FIRST) == */}
            {/* =============================================== */}
            <Line
              type="monotone"
              dataKey="score" // SAME dataKey as the main line
              stroke="url(#backgroundStrokeGradient)" // Use the enhanced gradient
              strokeWidth={12} // THICKER stroke for more dramatic effect
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false} // NO dots on the background line
              activeDot={false} // NO active dot effect
              filter="url(#lineBlur)" // Apply blur filter for glow effect
              animationDuration={1500} // Slower animation for more dramatic effect
              />

            {/* =============================================== */}
            {/* === ENHANCED FOREGROUND DATA LINE (Rendered SECOND) === */}
            {/* =============================================== */}
            <Line
              type="monotone"
              dataKey="score" // SAME dataKey
              stroke="url(#modernLineGradient)" // Sharp, vibrant gradient
              strokeWidth={3} // Slightly thicker for better visibility
              strokeLinecap="round"
              dot={(props) => {
                const { key, ...restProps } = props;
                return <CustomDot key={key} {...restProps} />;
              }} // Custom dots
              activeDot={(props: any) => { // Enhanced active dot with glow
                const { key, ...restProps } = props;
                return (
                  <g key={key} filter="url(#dotGlow)">
                    <circle {...restProps} r={8} fill="#6366f1" stroke={colors.background} strokeWidth={2.5} />
                  </g>
                );
              }}
              animationDuration={1200} // Slightly faster than background for effect
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Modern Bottom Section */}
       <div className="mt-4 pt-3 dark:border-white/5 border-t border-black/5">
         <h3 className="mb-2 font-medium text-muted-foreground text-xs">Recent Milestones</h3>
         <div className="gap-2 grid grid-cols-3">
           {[...data].reverse().slice(0, 3).map((item) => (
             <div key={item.model} className="bg-gradient-to-br from-white dark:from-gray-900 to-gray-50/80 dark:to-black/80 hover:shadow-md p-2 border dark:border-white/5 dark:hover:border-indigo-900/30 border-black/5 rounded-lg transition-all">
               <p className="font-medium text-gray-800 dark:text-gray-200 text-xs truncate">{item.model}</p>
               <p className="bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500 mt-0.5 font-bold text-transparent text-base">{item.score}%</p>
               <p className="mt-0.5 text-[9px] text-muted-foreground">{formatDate(item.date)}</p>
             </div>
           ))}
         </div>
       </div>
    </div>
  );
};

export default Hle;