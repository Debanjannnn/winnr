"use client";

import { motion } from "framer-motion";

import { labChecks } from "./data";

export function AgentLab() {
  return (
    <motion.section
      className="agent-lab"
      id="labs"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="lab-grid" aria-hidden />
      <motion.div className="lab-card feedback" animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity }}>
        <strong>Fine-tuning Feedback Recorded</strong>
        <p>The agent used a human correction to tune its next response.</p>
        <span>Model feedback</span>
        <span>Product details</span>
        <span>Refine API call pattern</span>
      </motion.div>
      <motion.div className="lab-card menu" animate={{ y: [0, 8, 0] }} transition={{ duration: 5.4, repeat: Infinity }}>
        <span>Web Search</span>
        <span>General Dialogue</span>
        <span>Data Source</span>
      </motion.div>
      <motion.div className="lab-card checks" animate={{ y: [0, -7, 0] }} transition={{ duration: 5.8, repeat: Infinity }}>
        {labChecks.map((check) => (
          <span key={check}>{check}</span>
        ))}
      </motion.div>
      <motion.div className="lab-card controls" animate={{ y: [0, 9, 0] }} transition={{ duration: 6.2, repeat: Infinity }}>
        <strong>Conditional Guidelines</strong>
        <div>
          <span>Choose user preference</span>
          <span>Product Type</span>
          <span>contains</span>
          <span>tickets</span>
          <span>Add +</span>
        </div>
      </motion.div>
      <motion.div
        className="lab-center"
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <h2>Watch it prove itself live</h2>
        <p>Permission granted. Paywall paid. Odds debated. Trade confirmed. Four real events, live, with no edits.</p>
        <a href="/workflow">Open a live run ↗</a>
      </motion.div>
    </motion.section>
  );
}
