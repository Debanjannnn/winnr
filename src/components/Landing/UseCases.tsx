"use client";

import { motion } from "framer-motion";

import { useCases } from "./data";
import { TextAscend, WordReveal } from "./MotionPrimitives";

export function UseCases() {
  return (
    <motion.section
      className="agent-section use-cases"
      id="use-cases"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        <p className="agent-kicker">Winnr</p>
        <TextAscend as="h2" duration={0.95} stagger={0.12}>
          {"Eight agents, one job each,\nand zero blind spots"}
        </TextAscend>
      </div>
      <motion.div
        className="use-case-list"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.055 } }
        }}
      >
        {useCases.map(({ title, description }, index) => (
          <motion.details
            key={title}
            open={index === 0}
            variants={{
              hidden: { opacity: 0, x: 22, filter: "blur(8px)" },
              show: { opacity: 1, x: 0, filter: "blur(0px)" }
            }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            whileHover={{ x: 5 }}
          >
            <summary>
              <span>{title}</span>
              <b aria-hidden>+</b>
            </summary>
            <WordReveal text={description} as="p" stagger={0.006} blur={5} />
          </motion.details>
        ))}
      </motion.div>
    </motion.section>
  );
}
