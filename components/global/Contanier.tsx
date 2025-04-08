"use client";

import { cn } from "@/lib/utils"; 
import { motion, Transition } from "framer-motion";
import React from "react";

interface Props {
    className?: string;
    children: React.ReactNode;
    /** Animation delay in seconds */
    delay?: number;
    /** Reverse the initial animation direction (slide up instead of down) */
    reverse?: boolean;
    /** Use a simpler, potentially faster tween animation instead of the default spring */
    simple?: boolean;
    /** The amount the element should be offset initially */
    offsetY?: number;
    /** Viewport amount threshold (0 to 1) to trigger the animation */
    viewportAmount?: number;
}

const Container = ({
    children,
    className,
    delay = 0.2, // Keep default delay reasonable
    reverse = false,
    simple = false,
    offsetY = 30, // Slightly increased offset for a smoother visual journey
    viewportAmount = 0.2 // Trigger when 20% is visible for responsiveness
}: Props) => {

    // Define the animation variants for clarity
    const initial = {
        opacity: 0,
        y: reverse ? -offsetY : offsetY,
        scale: 0.98 // Subtle scale down initially for sleekness
    };

    const whileInView = {
        opacity: 1,
        y: 0,
        scale: 1 // Scale back to normal
    };

    // --- Define the core transition logic ---

    const transitionConfig: Transition = simple
        ? { // Simple: Smooth Tween Animation
            type: "tween",
            ease: [0.25, 1, 0.5, 1], // Custom cubic bezier for very smooth ease-out
            duration: 0.5, // Slightly longer duration for tween smoothness
            delay: delay,
          }
        : { // Default: Extremely Smooth Spring Animation
            type: "spring",
            stiffness: 120, // Lower stiffness for a softer, smoother spring
            damping: 24,    // Adequate damping to prevent excessive oscillation
            mass: 1,        // Standard mass
            delay: delay,
            // Let the spring physics determine the duration naturally
          };

    return (
        <motion.div
            className={cn("w-full h-full", className)}
            initial={initial}
            whileInView={whileInView}
            // Trigger animation only once when it enters the viewport
            // Adjust 'amount' to control when the animation triggers (0 to 1)
            viewport={{ once: true, amount: viewportAmount }}
            transition={transitionConfig}
        >
            {children}
        </motion.div>
    );
};

export default Container;