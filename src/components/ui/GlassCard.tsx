"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

/** Executive card surface (name kept for compatibility). */
export function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <motion.div
      initial={false}
      whileHover={
        hover
          ? {
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
            }
          : undefined
      }
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm",
        "portal-transition",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
