"use client";

import { motion } from "framer-motion";

import { navLinks } from "./data";

export function SiteHeader() {
  return (
    <motion.header
      className="agent-nav"
      aria-label="Primary navigation"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <nav>
        {navLinks.map(({ href, label }, i) => (
          <motion.a key={href} href={href} className={i === 0 ? "agent-nav-active" : ""} whileHover={{ x: 1 }} transition={{ duration: 0.15 }}>
            {i === 0 && <span className="agent-nav-arrow" aria-hidden>▶</span>}
            {label}
          </motion.a>
        ))}
      </nav>

      <a className="agent-nav-logo" href="/" aria-label="Home">
        <motion.img
          src="/logo-winnr-png.png"
          alt="Winnr"
          whileHover={{ scale: 1.04 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
        />
      </a>

      <motion.a className="agent-launch" href="/workflow" whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
        Launch agent
        <span aria-hidden>↗</span>
      </motion.a>
    </motion.header>
  );
}
