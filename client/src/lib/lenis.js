/**
 * Smooth scroll setup using Lenis.
 * Returns a cleanup function.
 */
import Lenis from 'lenis';

let lenisInstance = null;

export function initLenis() {
  if (lenisInstance) return lenisInstance;

  lenisInstance = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.5,
  });

  function raf(time) {
    lenisInstance.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  return lenisInstance;
}

export function getLenis() {
  return lenisInstance;
}

export function destroyLenis() {
  if (lenisInstance) {
    lenisInstance.destroy();
    lenisInstance = null;
  }
}

export function scrollToId(id) {
  const el = document.getElementById(id);
  if (el && lenisInstance) {
    lenisInstance.scrollTo(el, { offset: -80 });
  } else if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
