/**
 * ScrollFloat — character-by-character reveal as the heading scrolls into view.
 * Adapted from code.md (ScrollFloat component).
 *
 * v3: Groups characters into word-level spans so text wraps at word
 * boundaries (not mid-word). Fixes the "letters cut off" issue.
 */
import { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ScrollFloat.css';

gsap.registerPlugin(ScrollTrigger);

export default function ScrollFloat({
  children,
  as: Tag = 'h2',
  containerClassName = '',
  textClassName = '',
  animationDuration = 1,
  ease = 'back.inOut(2)',
  scrollStart = 'center bottom+=50%',
  scrollEnd = 'bottom bottom-=40%',
  stagger = 0.03,
}) {
  const containerRef = useRef(null);

  // Split text into words, then each word into characters.
  // Words are wrapped in a span with display: inline-block so they
  // wrap as a unit (no mid-word breaks).
  const words = useMemo(() => {
    const text = typeof children === 'string' ? children : '';
    return text.split(' ').map((word, wi) => ({
      key: wi,
      chars: word.split('').map((char, ci) => ({ char, key: ci })),
      isLast: wi === text.split(' ').length - 1,
    }));
  }, [children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const charElements = el.querySelectorAll('.char');
    if (charElements.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        charElements,
        {
          willChange: 'opacity, transform',
          opacity: 0,
          yPercent: 120,
          scaleY: 2.3,
          scaleX: 0.7,
          transformOrigin: '50% 0%',
        },
        {
          duration: animationDuration,
          ease,
          opacity: 1,
          yPercent: 0,
          scaleY: 1,
          scaleX: 1,
          stagger,
          scrollTrigger: {
            trigger: el,
            start: scrollStart,
            end: scrollEnd,
            scrub: true,
          },
        }
      );
    }, el);

    const refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 300);

    return () => {
      ctx.revert();
      clearTimeout(refreshTimer);
    };
  }, [animationDuration, ease, scrollStart, scrollEnd, stagger, children]);

  return (
    <Tag ref={containerRef} className={`scroll-float ${containerClassName}`}>
      <span className={`scroll-float-text ${textClassName}`}>
        {words.map((word) => (
          <span className="word" key={word.key}>
            {word.chars.map((c) => (
              <span className="char" key={c.key}>
                {c.char}
              </span>
            ))}
            {!word.isLast && <span className="space">{'\u00A0'}</span>}
          </span>
        ))}
      </span>
    </Tag>
  );
}
