import React, { useState, useEffect, CSSProperties } from "react";
import { cn } from "@/lib/utils";
import Images from "@/app/(Marketing)/components/Svgs/svg";


interface OrbitingIconProps {
  Icon: React.FC<any>;
  radius: number;
  speed: number;
  startAngle: number;
  clockwise: boolean;
  size: number;
}

const OrbitingIcon: React.FC<OrbitingIconProps> = ({ 
  Icon, 
  radius, 
  speed, 
  startAngle, 
  clockwise, 
  size 
}) => {
  const [angle, setAngle] = useState(startAngle);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setAngle(prevAngle => {
        const direction = clockwise ? 1 : -1;
        return (prevAngle + speed * direction) % 360;
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [speed, clockwise]);
  
  const x = radius * Math.cos(angle * Math.PI / 180);
  const y = radius * Math.sin(angle * Math.PI / 180);
  
  return (
    <div
      className="absolute flex justify-center items-center bg-white dark:bg-gray-900 shadow-lg p-2 rounded-full hover:scale-110 transition-opacity transition-transform -translate-x-1/2 -translate-y-1/2 duration-500 transform"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <Icon width={size * 0.6} height={size * 0.6} />
    </div>
  );
};

interface InteractiveRippleProps {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
}

const InteractiveRipple: React.FC<InteractiveRippleProps> = ({
  mainCircleSize = 210,
  mainCircleOpacity = 0.15,
  numCircles = 5,
  className,
}) => {
  // Select some icons from your Images object
  const iconComponents = Object.values(Images).slice(0, 12);
  
  // Generate orbiting icons configuration
  const orbitingIcons = [
    // Inner orbit
    { Icon: iconComponents[0], radius: 120, speed: 0.8, startAngle: 0, clockwise: true, size: 50 },
    { Icon: iconComponents[1], radius: 120, speed: 0.8, startAngle: 90, clockwise: true, size: 50 },
    { Icon: iconComponents[2], radius: 120, speed: 0.8, startAngle: 180, clockwise: true, size: 50 },
    { Icon: iconComponents[3], radius: 120, speed: 0.8, startAngle: 270, clockwise: true, size: 50 },
    
    // Middle orbit
    { Icon: iconComponents[4], radius: 220, speed: 0.5, startAngle: 45, clockwise: false, size: 60 },
    { Icon: iconComponents[5], radius: 220, speed: 0.5, startAngle: 135, clockwise: false, size: 60 },
    { Icon: iconComponents[6], radius: 220, speed: 0.5, startAngle: 225, clockwise: false, size: 60 },
    { Icon: iconComponents[7], radius: 220, speed: 0.5, startAngle: 315, clockwise: false, size: 60 },
    
    // Outer orbit
    { Icon: iconComponents[8], radius: 320, speed: 0.3, startAngle: 22.5, clockwise: true, size: 70 },
    { Icon: iconComponents[9], radius: 320, speed: 0.3, startAngle: 112.5, clockwise: true, size: 70 },
    { Icon: iconComponents[10], radius: 320, speed: 0.3, startAngle: 202.5, clockwise: true, size: 70 },
    { Icon: iconComponents[11], radius: 320, speed: 0.3, startAngle: 292.5, clockwise: true, size: 70 },
  ];

  return (
    <div className="relative flex justify-center items-center bg-gradient-to-br from-gray-50 dark:from-gray-900 to-gray-100 dark:to-gray-800 w-full h-full min-h-screen overflow-hidden">
      <div
        className={cn(
          "relative w-full h-full flex items-center justify-center",
          className
        )}
      >
        {/* Ripple effect */}
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none select-none [mask-image:linear-gradient(to_bottom,white,transparent)]">
          {Array.from({ length: numCircles }, (_, i) => {
            const size = mainCircleSize + i * 90;
            const opacity = mainCircleOpacity - i * 0.02;
            const animationDelay = `${i * 0.1}s`;
            const borderStyle = i === numCircles - 1 ? "dashed" : "solid";
            
            return (
              <div
                key={i}
                className="absolute border rounded-full animate-ripple"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  opacity,
                  animationDelay,
                  borderStyle,
                  borderWidth: "1px",
                  borderColor: "currentColor",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
            );
          })}
        </div>
        
        {/* Center element */}
        <div className="z-10 relative flex justify-center items-center bg-white dark:bg-gray-800 shadow-lg p-6 rounded-full w-32 h-32">
          <div className="bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 font-bold text-transparent text-5xl">
            <span>+</span>
          </div>
        </div>
        
        {/* Orbiting icons */}
        {orbitingIcons.map((config, index) => (
          <OrbitingIcon key={index} {...config} />
        ))}
      </div>
    </div>
  );
};

export default InteractiveRipple;