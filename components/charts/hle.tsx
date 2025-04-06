import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area
} from 'recharts';

const Hle = () => {
  const [currentScore, setCurrentScore] = useState(33.0);
  
  // Sample data for AI model scores
  const data = [
    { date: '2024-01-24', model: 'Grok-2', score: 5 },
    { date: '2024-04-24', model: 'ChatGPT-4 Omni', score: 5 },
    { date: '2024-09-24', model: 'OpenAI O1', score: 10 },
    { date: '2024-12-24', model: 'Gemini Thinking', score: 6 },
    { date: '2025-02-25', model: 'DeepSeek', score: 8 },
    { date: '2025-03-25', model: 'OpenAI O3 Mini', score: 9 },
    { date: '2025-04-04', model: 'O3 Mini High', score: 11 },
    { date: '2025-04-25', model: 'OpenAI Deep Research', score: 28 },
    { date: '2025-04-25', model: 'Blaze Deep Research', score: 33 }
  ];
  
  // Update the score in a loop
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScore(prev => {
        // Loop between 31 and 36
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

  interface CustomTooltipProps {
    active: boolean;
    payload: any[]; // Specify the type of payload more precisely if possible
  }

  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isLatest = data.model === 'Blaze Deep Research';
      
      return (
        <div className="backdrop-blur-lg bg-white/80 dark:bg-black/80 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-2xl">
          <div className={`flex items-center gap-2 ${isLatest ? "text-violet-600 dark:text-violet-400" : "text-gray-800 dark:text-gray-200"}`}>
            <div className="h-2 w-2 rounded-full bg-violet-500"></div>
            <p className="font-medium font-serif">{data.model}</p>
            {isLatest && (
              <span className="bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-xs px-2 py-0.5 rounded-full font-serif">Latest</span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-serif">{formatDate(data.date)}</p>
          <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent font-serif">
            {isLatest ? currentScore.toFixed(1) : data.score}%
          </p>
        </div>
      );
    }
    return null;
  };

  interface CustomDotProps {
    cx: number;
    cy: number;
    payload: any;
  }

  const CustomDot: React.FC<CustomDotProps> = (props) => {
    const { cx, cy, payload } = props;
    const isLatest = payload.model === 'Blaze Deep Research';
    const isHighScore = payload.score >= 20;
    
    if (isLatest) {
      return (
        <g>
          <circle 
            cx={cx} 
            cy={cy} 
            r={14} 
            fill="rgba(139, 92, 246, 0.15)" 
            className="animate-ping"
          />
          <circle 
            cx={cx} 
            cy={cy} 
            r={10} 
            fill="rgba(139, 92, 246, 0.3)" 
          />
          <circle cx={cx} cy={cy} r={5} fill="#8B5CF6" />
        </g>
      );
    } else if (isHighScore) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill="rgba(139, 92, 246, 0.2)" />
          <circle cx={cx} cy={cy} r={4} fill="#8B5CF6" />
        </g>
      );
    }
    
    return (
      <circle cx={cx} cy={cy} r={3} fill="#8B5CF6" stroke="#fff" strokeWidth={1} />
    );
  };

  return (
    <div className="w-full bg-white dark:bg-black p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight font-serif">AI Model Performance</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-block h-2 w-2 rounded-full bg-violet-500"></span>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-serif">Intelligence Score (%)</span>
          </div>
        </div>
        <div className="relative flex items-center animate-pulse">
          <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full"></div>
          <div className="text-5xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent font-serif z-10">
            {currentScore.toFixed(1)}
          </div>
        </div>
      </div>
      
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
          >
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                <stop offset="100%" stopColor="#6366F1" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="rgba(156, 163, 175, 0.1)" 
            />
            
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              tick={{ fill: 'currentColor', fontSize: 12, fontFamily: 'serif' }}
              axisLine={{ stroke: 'rgba(156, 163, 175, 0.1)' }}
              tickLine={false}
              dy={10}
            />
            
            <YAxis 
              tickFormatter={(value) => `${value}%`}
              tick={{ fill: 'currentColor', fontSize: 12, fontFamily: 'serif' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 40]}
              ticks={[0, 5, 10, 15, 20, 25, 30, 35, 40]}
            />
            
            <Tooltip 
              content={<CustomTooltip active={false} payload={[]} />}
              cursor={false}
            />
            
            <ReferenceLine 
              y={20} 
              stroke="rgba(139, 92, 246, 0.3)" 
              strokeDasharray="4 4" 
              label={{ 
                value: 'Advanced AI Threshold', 
                position: 'insideBottomRight',
                fill: '#8B5CF6',
                fontSize: 11,
                fontFamily: 'serif'
              }} 
            />
            
            <Area
              type="monotone"
              dataKey="score"
              stroke="none"
              fill="url(#scoreAreaGradient)"
              fillOpacity={1}
            />
            
            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#scoreGradient)"
              strokeWidth={4}
              dot={(props) => <CustomDot {...props} />}
              activeDot={{ r: 8, strokeWidth: 0, fill: "#8B5CF6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-8 grid grid-cols-3 gap-4">
        {[...data].reverse().slice(1, 4).map((item, index) => (
          <div key={index} className="rounded-xl p-4 bg-gray-50 dark:bg-gray-900 backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-serif">{item.model}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-serif">
              {item.score}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-serif">{formatDate(item.date)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Hle;