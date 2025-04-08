/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import Images from "../svgs-new"; // Assuming this path is correct

// --- OrbitingIcon component remains the same as the previous correct version ---
interface OrbitingIconProps {
  Icon: React.FC<any> | null;
  radius: number;
  /** Speed in degrees per second */
  speed: number;
  startAngle: number;
  clockwise: boolean;
  size: number;
  className?: string;
}

const OrbitingIcon: React.FC<OrbitingIconProps> = ({
  Icon,
  radius,
  speed,
  startAngle,
  clockwise,
  size,
  className,
}) => {
  const [angle, setAngle] = useState(startAngle);
  const frameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = currentTime;
      }
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      const cappedDelta = Math.min(deltaTime, 0.1);
      lastTimeRef.current = currentTime;

      setAngle(prevAngle => {
        const direction = clockwise ? 1 : -1;
        const angleChange = speed * direction * cappedDelta;
        return (prevAngle + angleChange + 360) % 360;
      });
      frameIdRef.current = requestAnimationFrame(animate);
    };
    frameIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameIdRef.current !== null) { cancelAnimationFrame(frameIdRef.current); }
      lastTimeRef.current = null;
    };
  }, [speed, clockwise]);

  const angleInRadians = (angle * Math.PI) / 180;
  const x = Math.round(radius * Math.cos(angleInRadians));
  const y = Math.round(radius * Math.sin(angleInRadians));

  return (
    <div
      className={cn(
        "absolute flex justify-center items-center shadow-md rounded-full bg-background/70 backdrop-blur-sm border border-border/50",
        "transition-colors duration-300 hover:bg-background/90",
        className
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        top: `calc(50% - ${size / 2}px + ${y}px)`,
        left: `calc(50% - ${size / 2}px + ${x}px)`,
      }}
    >
      {Icon && <Icon width={size * 0.6} height={size * 0.6} />}
    </div>
  );
};
// --- End of OrbitingIcon ---


interface InteractiveRippleProps {
 // mainCircleSize is no longer used directly for ripple calculation based on orbits
 // mainCircleSize?: number;
 mainCircleOpacity?: number;
 numCircles?: number;
 className?: string;
 containerHeight?: string;
}

const InteractiveRipple: React.FC<InteractiveRippleProps> = ({
 // mainCircleSize = 120, // Removed direct usage
 mainCircleOpacity = 0.3,
 numCircles = 5, // Number of visual ripple lines
 className,
 containerHeight = "h-96" // 384px
}) => {
  const iconComponents = React.useMemo(() => {
    if (!Images || typeof Images !== 'object' || Object.keys(Images).length === 0) {
      console.warn("Images not loaded or empty, using null placeholders.");
      return Array(13).fill(null);
    }
    const icons = Object.values(Images)
      .filter(Boolean)
      .slice(0, 13)
      .map(Icon => Icon as React.FC<any> | null);
    while (icons.length < 13) { icons.push(null); }
    return icons;
  }, []);

  // Define the actual radii used for icon orbits
  const orbitRadii = {
    inner: 80,
    middle: 120,
    outer: 160,
  };

  const orbitingIcons = React.useMemo(() => [
    // Inner orbit (radius1)
    { Icon: iconComponents[0], radius: orbitRadii.inner, speed: 12, startAngle: 0, clockwise: true, size: 40 },
    { Icon: iconComponents[1], radius: orbitRadii.inner, speed: 12, startAngle: 180, clockwise: true, size: 40 },

    // Middle orbit (radius2)
    { Icon: iconComponents[3], radius: orbitRadii.middle, speed: 9, startAngle: 60, clockwise: false, size: 44 },
    { Icon: iconComponents[5], radius: orbitRadii.middle, speed: 9, startAngle: 240, clockwise: false, size: 44 },
    { Icon: iconComponents[12], radius: orbitRadii.middle, speed: 9, startAngle: 150, clockwise: false, size: 40 },

    // Outer orbit (radius3)
    { Icon: iconComponents[7], radius: orbitRadii.outer, speed: 7, startAngle: 30, clockwise: true, size: 42 },
    { Icon: iconComponents[8], radius: orbitRadii.outer, speed: 7, startAngle: 100, clockwise: true, size: 42 },
    { Icon: iconComponents[9], radius: orbitRadii.outer, speed: 7, startAngle: 170, clockwise: false, size: 42 },
    { Icon: iconComponents[10], radius: orbitRadii.outer, speed: 7, startAngle: 240, clockwise: false, size: 42 },
    { Icon: iconComponents[11], radius: orbitRadii.outer, speed: 7, startAngle: 310, clockwise: false, size: 42 },
  ] as OrbitingIconProps[], [iconComponents, orbitRadii.inner, orbitRadii.middle, orbitRadii.outer]); // Depend on radii


  // --- FIX START: Calculate ripple sizes based on actual orbit radii ---
  const minRippleRadius = 40; // Start ripples smaller than the first orbit
  const maxIconRadius = orbitRadii.outer; // Use the largest defined orbit radius
  // Make the largest ripple extend slightly beyond the outermost icons
  const maxRippleRadius = maxIconRadius + 30;
  // Ensure numCircles is at least 1 to avoid division by zero or negative numbers
  const numEffectiveCircles = Math.max(1, numCircles);
  // Calculate the radius increment between each ripple circle
  const radiusIncrement = numEffectiveCircles > 1
      ? (maxRippleRadius - minRippleRadius) / (numEffectiveCircles - 1)
      : 0; // If only one circle, increment is 0, size will be minRippleRadius * 2
  // --- FIX END ---


  return (
    <div
      className={`relative w-full ${containerHeight} flex justify-center items-center overflow-hidden`}
    >
      <div
        className={cn(
          "relative w-full h-full flex items-center justify-center",
          className
        )}
      >
        {/* Ripple effect */}
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          {Array.from({ length: numEffectiveCircles }, (_, i) => {
            // Calculate the radius for this specific ripple
            const currentRadius = minRippleRadius + i * radiusIncrement;
            // Diameter is twice the radius
            const size = Math.round(currentRadius * 2);

            // Adjust opacity and border based on index
            const opacity = mainCircleOpacity - (i * (mainCircleOpacity / (numEffectiveCircles * 1.5))); // Smoother fade out
            const animationDelay = `${i * 0.12}s`; // Slightly adjusted delay
            const borderStyle = i === numEffectiveCircles - 1 ? "dashed" : "solid";
            // Make border thinner and fainter for outer ripples
            const borderOpacity = 15 + Math.max(0, numEffectiveCircles - 1 - i) * 5; // Outer ones are fainter (starts higher for inner)
            const borderWidth = i === 0 ? "1.5px" : "1px";

            // Ensure ripple fits container (optional safety check)
            // const containerPixelHeight = 384; // Example for h-96
            // if (size > containerPixelHeight) return null; // Skip rendering if too large

            return (
              <div
                key={i}
                className="absolute border rounded-full"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  opacity: Math.max(0.05, opacity), // Ensure minimum visibility
                  animationDelay,
                  borderStyle,
                  borderWidth,
                  borderColor: `hsl(var(--foreground) / ${borderOpacity}%)`,
                  animation: "ripple-orbit 4s cubic-bezier(0.25, 0.1, 0.25, 1) infinite",
                  // Ensure ripples are centered
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            );
          })}
        </div>

        {/* Center element */}
        <div className="top-1/2 left-1/2 z-10 absolute bg-background/80 shadow-lg backdrop-blur-sm p-3 border border-border/50 rounded-full -translate-x-1/2 -translate-y-1/2 transform">
          {iconComponents[0] && React.createElement(iconComponents[0], { width: 40, height: 40 })}
        </div>

        {/* Orbiting icons */}
        {orbitingIcons.map((config, index) => (
          config.Icon ? <OrbitingIcon key={index} {...config} /> : null
        ))}
      </div>
    </div>
  );
};



InteractiveRipple.displayName = "InteractiveRipple";

export default InteractiveRipple;