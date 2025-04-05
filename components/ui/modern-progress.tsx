'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ModernProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string;
  isCriticallyLow?: boolean;
  isLowOnInvoices?: boolean;
  indeterminate?: boolean;
}

const ModernProgress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ModernProgressProps
>(({ className, value, indicatorClassName, isCriticallyLow, isLowOnInvoices, indeterminate = false, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-3 w-full overflow-hidden backdrop-blur-md rounded-full shadow-inner',
      className
    )}
    {...props}
  >
    {indeterminate ? (
      // Indeterminate progress with animated gradient
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full bg-gradient-to-r",
            isCriticallyLow
              ? "from-rose-500 via-red-500 to-rose-500"
              : isLowOnInvoices
              ? "from-amber-400 via-orange-500 to-amber-400"
              : "from-blue-600 via-pink-600 to-blue-500",
            "animate-gradient-fast",
            indicatorClassName
          )}
          initial={{ x: "-100%" }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ width: "60%" }}
        />
      </div>
    ) : (
      // Determinate progress with value
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full bg-gradient-to-r",
          isCriticallyLow
            ? "from-rose-500 via-red-500 to-rose-500 animate-gradient-fast"
            : isLowOnInvoices
            ? "from-amber-400 via-orange-500 to-amber-400 animate-gradient-fast"
            : "from-blue-600 via-pink-600 to-blue-500 animate-gradient-fast",
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    )}
  </ProgressPrimitive.Root>
));

ModernProgress.displayName = 'ModernProgress';

export { ModernProgress };