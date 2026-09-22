import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface OpeningSplashProps {
  onFinish: () => void;
}

export const OpeningSplash: React.FC<OpeningSplashProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1300);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div
      id="opening-splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950 select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center justify-center gap-4"
      >
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-900 border border-neutral-700/60 shadow-2xl">
          <svg
            className="h-7 w-7 text-neutral-100"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.25em] text-neutral-100 font-sans">
          LUXION
        </h1>
      </motion.div>
    </motion.div>
  );
};
