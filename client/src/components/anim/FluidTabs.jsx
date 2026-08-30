/**
 * FluidTabs — animated tab switcher with a sliding indicator.
 * Adapted from Code 2.md (FluidTabs component) using anime.js for the indicator.
 */
import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';
import './FluidTabs.css';

export default function FluidTabs({ tabs, value, onChange, className = '' }) {
  const listRef = useRef(null);
  const indicatorRef = useRef(null);
  const [internalValue, setInternalValue] = useState(value ?? tabs[0]?.value);
  const active = value ?? internalValue;

  const handleChange = (val) => {
    if (value === undefined) setInternalValue(val);
    onChange?.(val);
  };

  // Animate the indicator on tab change
  useEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    const activeTab = list.querySelector(`[data-value="${active}"]`);
    if (!activeTab) return;

    const listRect = list.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();

    anime({
      targets: indicator,
      left: tabRect.left - listRect.left,
      width: tabRect.width,
      duration: 350,
      easing: 'easeOutQuart',
    });
  }, [active, tabs]);

  // Recompute on mount and resize
  useEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    const position = () => {
      const activeTab = list.querySelector(`[data-value="${active}"]`);
      if (!activeTab) return;
      const listRect = list.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      indicator.style.left = `${tabRect.left - listRect.left}px`;
      indicator.style.width = `${tabRect.width}px`;
    };

    position();
    window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`fluid-tabs ${className}`} role="tablist">
      <div className="fluid-tabs__list" ref={listRef}>
        <span className="fluid-tabs__indicator" ref={indicatorRef} />
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            data-value={tab.value}
            aria-selected={active === tab.value}
            className={`fluid-tabs__tab ${active === tab.value ? 'is-active' : ''}`}
            onClick={() => handleChange(tab.value)}
          >
            {tab.icon && <span className="fluid-tabs__icon">{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className="fluid-tabs__count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
