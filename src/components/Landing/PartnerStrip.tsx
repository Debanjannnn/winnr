"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { partners } from "./data";
import { FadeIn, WordReveal } from "./MotionPrimitives";

function PartnerLogo({ logo, name }: { logo?: string | undefined; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!logo || failed) return null;
  return (
    <img
      src={logo}
      alt=""
      width={20}
      height={20}
      aria-hidden
      onError={() => setFailed(true)}
    />
  );
}

export function PartnerStrip() {
  return (
    <motion.section
      className="partner-strip"
      aria-label="Trusted by partner teams"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <WordReveal text="The rails real agents run on" as="p" stagger={0.03} />
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35 }}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.045 } }
        }}
      >
        {partners.map(({ name, logo }) => (
          <motion.span
            key={name}
            variants={{
              hidden: { opacity: 0, y: 10, filter: "blur(8px)" },
              show: { opacity: 1, y: 0, filter: "blur(0px)" }
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{ y: -3, color: "rgba(246, 245, 255, 0.92)" }}
          >
            <PartnerLogo logo={logo} name={name} />
            {name}
          </motion.span>
        ))}
      </motion.div>
    </motion.section>
  );
}
