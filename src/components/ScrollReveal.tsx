'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function ScrollReveal({ id, children }: { id: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return <motion.section
    id={id}
    className="scroll-mt-20 py-14 sm:py-20"
    initial={reduceMotion ? false : { opacity: 0, y: 28, filter: 'blur(6px)' }}
    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
    viewport={{ once: true, amount: 0.16 }}
    transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
  >{children}</motion.section>;
}
