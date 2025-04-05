import { useState, useEffect } from "react";

interface ThinkingCardProps {
  thinking: string;
  isVisible: boolean;
}

export default function ThinkingCard({ thinking, isVisible }: ThinkingCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(isVisible);
  }, [isVisible]);

  return (
    <div
      className={`fixed bottom-10 right-10 w-[30rem] max-h-[75vh] transition-all duration-700 ease-in-out z-50
        ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16 pointer-events-none"}`}
    >
      <div className="bg-white/90 dark:bg-black/90 shadow-3xl backdrop-blur-2xl p-8 border dark:border-white/5 border-black/5 rounded-3xl overflow-y-auto">
        <h3 className="mb-6 font-serif font-medium text-black dark:text-white text-2xl tracking-tight">
          Thinking Stream
        </h3>
        <p className="font-serif text-black/80 dark:text-white/80 text-base leading-relaxed whitespace-pre-wrap">
          {thinking || "Initializing thought process..."}
        </p>
      </div>
    </div>
  );
}