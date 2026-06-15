"use client";

import { motion, useScroll, useTransform, type HTMLMotionProps, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";

type TextAscendProps = {
  children: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  delay?: number;
  stagger?: number;
  duration?: number;
  y?: string | number;
  once?: boolean;
};

const ascendContainer = (stagger: number, delay: number): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: delay }
  }
});

const ascendLine = (duration: number, y: string | number): Variants => ({
  hidden: { y, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration, ease: [0.22, 1, 0.36, 1] }
  }
});

export function TextAscend({
  children,
  className,
  as = "span",
  delay = 0,
  stagger = 0.15,
  duration = 1.1,
  y = "110%",
  once = true
}: TextAscendProps) {
  const MotionTag = motion[as] as typeof motion.span;
  const lines = children.split("\n");

  return (
    <MotionTag
      className={className}
      variants={ascendContainer(stagger, delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-10% 0px -10% 0px" }}
    >
      {lines.map((text) => (
        <span key={text} className="motion-line-mask">
          <motion.span className="motion-line" variants={ascendLine(duration, y)}>
            {text}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

type WordRevealProps = {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  blur?: number;
  y?: number;
  as?: "p" | "span" | "div";
};

export function WordReveal({
  text,
  className,
  delay = 0,
  stagger = 0.035,
  blur = 8,
  y = 10,
  as = "p"
}: WordRevealProps) {
  const words = text.split(/\s+/);
  const Container = motion[as] as typeof motion.p;

  return (
    <Container
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren: delay }
        }
      }}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="motion-word"
          variants={{
            hidden: { opacity: 0, y, filter: `blur(${blur}px)` },
            visible: { opacity: 1, y: 0, filter: "blur(0px)" }
          }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
          {index < words.length - 1 ? "\u00a0" : ""}
        </motion.span>
      ))}
    </Container>
  );
}

type FadeInProps = HTMLMotionProps<"div"> & {
  delay?: number;
  y?: number;
  duration?: number;
  blur?: number;
};

export function FadeIn({ delay = 0, y = 32, duration = 1.3, blur = 12, children, ...rest }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: `blur(${blur}px)` }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type ParallaxSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  speed?: number;
  y?: number;
  blur?: number;
};

export function ParallaxSection({
  children,
  className,
  delay = 0,
  duration = 1.4,
  speed = 60,
  y = 48,
  blur = 14
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [speed, -speed]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y: parallaxY, willChange: "transform" }}>
        <FadeIn delay={delay} duration={duration} y={y} blur={blur}>
          {children}
        </FadeIn>
      </motion.div>
    </div>
  );
}
