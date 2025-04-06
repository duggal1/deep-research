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
        <div className="bg-white/80 dark:bg-black/80 shadow-2xl backdrop-blur-lg p-4 border border-gray-100 dark:border-gray-800 rounded-xl">
          <div className={`flex items-center gap-2 ${isLatest ? "text-violet-600 dark:text-violet-400" : "text-gray-800 dark:text-gray-200"}`}>
            <div className="bg-violet-500 rounded-full w-2 h-2"></div>
            <p className="font-serif font-medium">{data.model}</p>
            {isLatest && (
              <span className="bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 rounded-full font-serif text-violet-600 dark:text-violet-400 text-xs">Latest</span>
            )}
          </div>
          <p className="mt-1 font-serif text-gray-500 dark:text-gray-400 text-xs">{formatDate(data.date)}</p>
          <p className="bg-clip-text bg-gradient-to-r from-violet-600 dark:from-violet-400 to-indigo-600 dark:to-indigo-400 mt-2 font-serif font-bold text-transparent text-3xl">
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
    <div className="shadow-xl p-8 rounded-xl w-full">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="font-serif font-bold text-gray-900 dark:text-white text-2xl tracking-tight">AI Model Performance</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-block bg-violet-500 rounded-full w-2 h-2"></span>
            <span className="font-serif text-gray-500 dark:text-gray-400 text-sm">Intelligence Score (%)</span>
          </div>
        </div>
        <div className="relative flex items-center animate-pulse">

          <div className='relative flex justify-center items-center bg-black dark:bg-gray-800 rounded-md'>
          <div className="font-bold text-gray-50 text-serif dark:text-gray-900 dark:font">
          {currentScore.toFixed(1)}
          </div>
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
      
      <div className="gap-4 grid grid-cols-3 mt-8">
        {[...data].reverse().slice(0, 3).map((item, index) => (
          <div key={index} className="bg-gray-200 dark:bg-gray-900 opacity-80 dark:bg-rabg-opacity-80 backdrop-blur-md p-4 rounded-xl">
            <div className="font-serif text-gray-500 dark:text-gray-400 text-xs">{item.model}</div>
            <div className="font-serif font-bold text-gray-900 dark:text-white text-2xl">
              {item.score}%
            </div>
            <div className="font-serif text-gray-500 dark:text-gray-400 text-xs">{formatDate(item.date)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Hle;