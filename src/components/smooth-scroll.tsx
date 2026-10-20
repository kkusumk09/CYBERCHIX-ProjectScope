"use client";

/**
 * Lenis smooth scrolling.
 *
 * Lenis is mounted on the root element and driven by requestAnimationFrame.
 * It is disabled when the visitor asks for reduced motion, and it is cleaned
 * up on unmount so React's strict-mode double-mount does not leave two
 * instances running.
 *
 * Docs: https://github.com/darkroomengineering/lenis
 */
import Lenis from "lenis";
import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
