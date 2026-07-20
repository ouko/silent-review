import { useState, useEffect, useRef, useCallback } from "react";

const PRELOAD_AHEAD = 2;
const PRELOAD_BEHIND = 1;
const CLEANUP_DISTANCE = 5;

export function useVideoFeed(itemCount: number) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const shouldPlay = useCallback(
    (index: number) => index === activeIndex,
    [activeIndex]
  );

  const shouldPreload = useCallback(
    (index: number) => {
      const distance = Math.abs(index - activeIndex);
      return (
        distance <= PRELOAD_AHEAD ||
        (index < activeIndex && distance <= PRELOAD_BEHIND)
      );
    },
    [activeIndex]
  );

  const shouldRender = useCallback(
    (index: number) => Math.abs(index - activeIndex) <= CLEANUP_DISTANCE,
    [activeIndex]
  );

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const index = Number(entry.target.getAttribute("data-index"));
            if (!Number.isNaN(index)) {
              setActiveIndex(index);
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    itemRefs.current.forEach((el) => {
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [itemCount]);

  const setItemRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    itemRefs.current[index] = el;
  }, []);

  return { activeIndex, setItemRef, shouldPlay, shouldPreload, shouldRender };
}
