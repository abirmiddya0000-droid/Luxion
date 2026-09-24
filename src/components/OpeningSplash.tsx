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
      exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none font-mono"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center justify-center gap-3"
      >
        <h1 className="text-2xl sm:text-3xl font-bold tracking-[0.3em] text-white">
          LUXION
        </h1>
      </motion.div>
    </motion.div>
  );
};
