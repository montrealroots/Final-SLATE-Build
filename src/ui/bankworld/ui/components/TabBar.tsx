/**
 * SLATE — a screen's tabs (from 2026-10-23, the owner's brief 23), one bar for every screen that has them. Until then
 * School, Money, Career and Papers each drew their own, the same tab list four times, and on a phone the last tab that
 * didn't fit was cut at the edge with nothing to say there were more.
 *
 * A tab list as WAI-ARIA's Tabs pattern has it: the arrows move between the tabs, Home and End go to the ends, and only
 * the selected tab is in the page's tab order. A bar wider than the page scrolls sideways: it fades on the side that has
 * more and puts a button there that scrolls it on, and the selected tab is scrolled into view whenever it changes.
 */

import { useEffect, useRef, useState } from 'react';

export interface TabBarTab<T extends string> { id: T; label: string }

export function TabBar<T extends string>({ tabs, tab, onTab, label, idPrefix }: {
  tabs: readonly TabBarTab<T>[];
  tab: T;
  onTab: (tab: T) => void;
  /** The tab list's name, as a screen reader says it. */
  label: string;
  /** Each tab's id is `${idPrefix}-tab-${id}`, and the pane it controls `${idPrefix}-pane-${id}`. */
  idPrefix: string;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<'none' | 'start' | 'end' | 'both'>('none');

  // Which side has more, read as the bar scrolls and as the page changes size.
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const read = () => {
      const start = el.scrollLeft > 2;
      const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setOverflow(start && end ? 'both' : start ? 'start' : end ? 'end' : 'none');
    };
    read();
    el.addEventListener('scroll', read, { passive: true });
    const sized = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(read);
    sized?.observe(el);
    return () => { el.removeEventListener('scroll', read); sized?.disconnect(); };
  }, [tabs.length]);

  // The selected tab in view, whenever it changes.
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [tab]);

  const go = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length]!;
    onTab(next.id);
    document.getElementById(`${idPrefix}-tab-${next.id}`)?.focus();
  };
  const scroll = (way: 1 | -1) => list.current?.scrollBy?.({ left: way * list.current.clientWidth * 0.7, behavior: 'smooth' });

  return (
    <div className="tabs-wrap" data-overflow={overflow}>
      {/* The buttons that scroll the bar are for a pointer and a finger; a keyboard moves through the tabs with the arrows. */}
      <button type="button" className="tabs-more" data-side="start" tabIndex={-1} aria-hidden="true" onClick={() => scroll(-1)}>‹</button>
      <div className="tabs" role="tablist" aria-label={label} ref={list}>
        {tabs.map((one, i) => (
          <button
            key={one.id}
            id={`${idPrefix}-tab-${one.id}`}
            type="button"
            role="tab"
            className="tab"
            aria-selected={one.id === tab}
            aria-controls={`${idPrefix}-pane-${one.id}`}
            tabIndex={one.id === tab ? 0 : -1}
            onClick={() => onTab(one.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
              else if (e.key === 'Home') { e.preventDefault(); go(0); }
              else if (e.key === 'End') { e.preventDefault(); go(tabs.length - 1); }
            }}
          >
            {one.label}
          </button>
        ))}
      </div>
      <button type="button" className="tabs-more" data-side="end" tabIndex={-1} aria-hidden="true" onClick={() => scroll(1)}>›</button>
    </div>
  );
}
