"use client";

import { motion } from "framer-motion";

import { ParallaxSection, TextAscend, WordReveal } from "./MotionPrimitives";

export function Manifesto() {
  return (
    <motion.section
      className="manifesto"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <TextAscend as="h2" duration={1} stagger={0.12}>
        {"We didn’t fake autonomy. We gave agents real money,\nreal markets, and a trail you can read."}
      </TextAscend>
      <ParallaxSection className="ghost-bars" speed={36} y={24} blur={10}>
        <div aria-hidden />
      </ParallaxSection>
      <div className="manifesto-copy">
        <WordReveal
          text="An agent is only worth trusting if you can see what it did — and stop it cold. Ours run on signed permissions, not promises."
          stagger={0.012}
        />
        <WordReveal
          text="Scout finds the market. Evidence pays for the signal. Research debates the odds on Venice. Risk sizes the position. Execution fires through 1Shot — and the Narrator explains every move, on the record. You watch it happen. You can stop it anytime."
          stagger={0.009}
          delay={0.08}
        />
      </div>
    </motion.section>
  );
}
