/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import Images from "../svgs-new"; // Assuming this path is correct

interface OrbitingIconProps {
  Icon: React.FC<any> | null;
  radius: number;
  /** Speed in degrees per second */
  speed: number;
  startAngle: number;
  clockwise: boolean;
  size: number;
  className?: string; // Added className prop for potential styling overrides
}

const OrbitingIcon: React.FC<OrbitingIconProps> = ({
  Icon,
  radius,
  speed,
  startAngle,
  clockwise,
  size,
  className, // Use className
}) => {
  const [angle, setAngle] = useState(startAngle);
  const frameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = currentTime; // Initialize last time on first frame
      }
      
      // Calculate time elapsed since the last frame in seconds
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      setAngle(prevAngle => {
        const direction = clockwise ? 1 : -1;
        // Update angle based on speed (degrees per second) and time elapsed
        const angleChange = speed * direction * deltaTime;
        // Use modulo 360 to keep the angle within bounds and handle wrapping correctly
        return (prevAngle + angleChange) % 360;
      });

      // Request the next animation frame
      frameIdRef.current = requestAnimationFrame(animate);
    };

    // Start the animation loop
    frameIdRef.current = requestAnimationFrame(animate);

    // Cleanup function to cancel the animation frame when the component unmounts
    // or when dependencies change causing the effect to re-run
    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }
      lastTimeRef.current = null; // Reset last time on cleanup/restart
    };
  }, [speed, clockwise]); // Re-run effect only if speed or direction changes

  // Calculate position using trigonometry
  // angle needs to be in radians for Math.cos/sin
  const angleInRadians = angle * (Math.PI / 180);
  const x = radius * Math.cos(angleInRadians);
  const y = radius * Math.sin(angleInRadians);

  return (
    <div
      className={cn(
        "absolute flex justify-center items-center shadow-md p-2 rounded-full",
        "transition-transform duration-300 hover:scale-105", // Only transition transform for hover effect
        className // Apply passed className
      )}
      style={{
        // Position the element's origin at the center of the parent
        left: `50%`,
        top: `50%`,
        width: `${size}px`,
        height: `${size}px`,
        // Use transform for positioning:
        // 1. translate(-50%, -50%) centers the element itself at the (left, top) point.
        // 2. translate(x, y) moves the centered element along the orbit.
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
        WebkitTransform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, // For broader browser support
      }}
    >
      {Icon && <Icon width={size * 0.6} height={size * 0.6} />}
    </div>
  );
};

// --- InteractiveRipple Component (Mostly unchanged, but adjusting speed values) ---

interface InteractiveRippleProps {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
  containerHeight?: string;
}

const InteractiveRipple: React.FC<InteractiveRippleProps> = ({
  mainCircleSize = 120,
  mainCircleOpacity = 0.24,
  numCircles = 5,
  className,
  containerHeight = "h-64"
}) => {
  // Make sure Images is properly imported and valid before using it
  const iconComponents = React.useMemo(() => {
    // Ensure Images is loaded and is an object before accessing its values
    if (!Images || typeof Images !== 'object' || Object.keys(Images).length === 0) {
      console.warn("Images not loaded or empty, using null placeholders.");
      return Array(13).fill(null); // Fill with nulls
    }

    const icons = Object.values(Images)
      .filter(Boolean) // Filter out any potentially undefined/null values from the object
      .slice(0, 13) // Take up to 13 icons
      .map(Icon => Icon as React.FC<any> | null);

    // Ensure we have exactly 13 elements, pad with null if needed
    while (icons.length < 13) {
      icons.push(null);
    }
    return icons;
  // Dependency array should ideally include Images if it could change, 
  // but typically imports are static. If Images could be dynamic, add it.
  }, []); 

  // Define orbiting icons configuration
  // Adjusted speed values assuming the original values were "degrees per ~50ms frame"
  // New speed is degrees per second (original * 20 approx)
  const orbitingIcons = React.useMemo(() => [
    // Inner orbit (Radius 60)
    { Icon: iconComponents[0], radius: 60, speed: 24, startAngle: 0, clockwise: true, size: 40 }, // 1.2 * 20 = 24
    { Icon: iconComponents[1], radius: 60, speed: 24, startAngle: 120, clockwise: true, size: 40 },
    // { Icon: iconComponents[2], radius: 60, speed: 24, startAngle: 240, clockwise: true, size: 30 },

    // Middle orbit (Radius 120)
    { Icon: iconComponents[3], radius: 120, speed: 18, startAngle: 60, clockwise: false, size: 56 }, // 0.9 * 20 = 18
    // { Icon: iconComponents[4], radius: 120, speed: 18, startAngle: 180, clockwise: false, size: 36 },
    { Icon: iconComponents[5], radius: 120, speed: 18, startAngle: 300, clockwise: false, size: 56 },

    // Outer orbit (Radius 180)
    // { Icon: iconComponents[6], radius: 180, speed: 12, startAngle: 30, clockwise: true, size: 42 }, // 0.6 * 20 = 12
    { Icon: iconComponents[7], radius: 180, speed: 12, startAngle: 150, clockwise: true, size: 42 },
    { Icon: iconComponents[8], radius: 180, speed: 12, startAngle: 270, clockwise: true, size: 42 },

    // Even Outer orbit (Radius 210)
    { Icon: iconComponents[9], radius: 210, speed: 8, startAngle: 50, clockwise: false, size: 42 }, // 0.4 * 20 = 8
    { Icon: iconComponents[10], radius: 210, speed: 8, startAngle: 190, clockwise: false, size: 42 },
    { Icon: iconComponents[11], radius: 210, speed: 8, startAngle: 310, clockwise: false, size: 42 },
    // { Icon: iconComponents[12], radius: 210, speed: 8, startAngle: 310, clockwise: false, size: 42 }, // Duplicate angle removed
  ] as OrbitingIconProps[], [iconComponents]);

  return (
    <div className={`relative flex justify-center items-center bg-transparent w-full ${containerHeight} overflow-hidden`}>
      <div
        className={cn(
          "relative w-full h-full flex items-center justify-center",
          className
        )}
      >
        {/* Fixed Ripple effect */}
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          {Array.from({ length: numCircles }, (_, i) => {
            const size = mainCircleSize + i * 50;
            const opacity = mainCircleOpacity - i * 0.03;
            const animationDelay = `${i * 0.06}s`;
            const borderStyle = i === numCircles - 1 ? "dashed" : "solid";
            const borderOpacity = 5 + i * 5;

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
                  borderColor: `hsl(var(--foreground) / ${borderOpacity}%)`,
                  transform: "scale(1)", // Initial scale for animation
                }}
              />
            );
          })}
        </div>

        {/* Center element */}
        <div className="">
          <img
            src="/blaze-dark.png"
            alt="Blaze"
            width={60}
            height={60}
            className="object-cover"
          />
        </div>

        {/* Orbiting icons */}
        {orbitingIcons.map((config, index) => (
          // Ensure Icon component exists before rendering OrbitingIcon
          config.Icon ? <OrbitingIcon key={index} {...config} /> : null 
        ))}
      </div>
    </div>
  );
};

InteractiveRipple.displayName = "InteractiveRipple";

export default InteractiveRipple;