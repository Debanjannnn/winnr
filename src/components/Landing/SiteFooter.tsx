"use client";

import { motion } from "framer-motion";

export function SiteFooter() {
  return (
    <motion.footer
      className="agent-footer"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="footer-brand">
        <img src="/logo-winnr-png.png" alt="Winnr" className="footer-logo" />
        <h2>
          AI That Understands. Acts.
          <br />
          Learns
        </h2>
      </div>
      <div className="footer-middle">
        <div>
          <p>Explore</p>
          <a href="#platform">Platform</a>
          <a href="#use-cases">Agent network</a>
          <a href="/workflow">Live workflow</a>
        </div>
      </div>
      <form className="footer-newsletter">
        <label htmlFor="newsletter">Newsletter</label>
        <p>Get exclusive updates on AI agents, product releases, and behind-the-scenes tech deep dives, delivered monthly.</p>
        <div>
          <input id="newsletter" type="email" placeholder="Enter your email..." />
          <button type="button">Subscribe</button>
        </div>
      </form>
      <div className="footer-bottom">
        <span>© 2025 Winnr</span>
        <span>Signed permissions. Audited execution. Revocable access.</span>
      </div>
    </motion.footer>
  );
}
