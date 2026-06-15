"use client";

import { motion } from "framer-motion";

import { FadeIn, TextAscend, WordReveal } from "./MotionPrimitives";

export function PlatformSection() {
  return (
    <motion.section
      className="agent-section agent-framework"
      id="platform"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <FadeIn y={28} duration={1.1} blur={10}>
        <TextAscend as="h2" stagger={0.12} duration={0.9}>
          {"Hand an agent a wallet\nwithout losing a night's sleep"}
        </TextAscend>
      </FadeIn>
      <motion.div initial={{ opacity: 0, x: 18, filter: "blur(10px)" }} whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }} viewport={{ once: true }}>
        <WordReveal
          text="Most agents run on a fake balance. Yours run on a real one — scoped, revocable, time-boxed. They pass authority to each other as audited events and never spend a cent outside the grant you signed."
          stagger={0.012}
          blur={7}
        />
        <a href="/workflow">Grant access ↗</a>
      </motion.div>
    </motion.section>
  );
}
