"use client";

import { motion } from "framer-motion";

import { stats } from "./data";

export function StatsGrid() {
  return (
    <motion.section
      className="stats-grid"
      aria-label="Platform metrics"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.1 } }
      }}
    >
      {stats.map(({ value, label }) => (
        <motion.article
          key={value}
          variants={{
            hidden: { opacity: 0, y: 24, filter: "blur(10px)" },
            show: { opacity: 1, y: 0, filter: "blur(0px)" }
          }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -6, backgroundColor: "rgba(160, 107, 255, 0.035)" }}
        >
          <strong>{value}</strong>
          <span>{label}</span>
        </motion.article>
      ))}
    </motion.section>
  );
}
