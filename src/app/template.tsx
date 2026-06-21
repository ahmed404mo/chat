"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ 
        duration: 0.35, 
        ease: [0.22, 1, 0.36, 1] // توقيت ناعم جداً (Cubic Bezier) زي تطبيقات الموبايل
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}