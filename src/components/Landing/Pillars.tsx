"use client";

import { motion } from "framer-motion";

import { features } from "./data";
import { FadeIn, TextAscend } from "./MotionPrimitives";

export function Pillars() {
  return (
    <>
      <motion.section
        className="agent-section feature-head"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <FadeIn y={22} duration={1} blur={10}>
          <p className="agent-kicker">Our pillars</p>
          <TextAscend as="h2" duration={0.9}>Built so it can&rsquo;t go rogue</TextAscend>
        </FadeIn>
        <div className="arrow-pair" aria-hidden>
          <span>←</span>
          <span>→</span>
        </div>
      </motion.section>

      <motion.section
        className="feature-rail"
        aria-label="Agent capabilities"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.11 } }
        }}
      >
        {features.map(({ index, title, text }) => (
          <motion.article
            key={title}
            variants={{
              hidden: { opacity: 0, y: 24, scale: 0.98, filter: "blur(10px)" },
              show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
            }}
            transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6, borderColor: "rgba(160, 107, 255, 0.24)" }}
          >
            <span>{index}</span>
            <motion.div
              className={`feature-glyph feature-glyph-${index}`}
              aria-hidden
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: Number(index) * 0.2 }}
            />
            <h3>{title}</h3>
            <p>{text}</p>
          </motion.article>
        ))}
      </motion.section>
    </>
  );
}
