import { useState, useEffect, useCallback } from 'react';

interface UseScrollDetectorOptions {
  threshold?: number; // Number of scrolls to trigger visibility (default: 3)
  scrollThreshold?: number; // Pixel threshold for scroll detection (default: 100)
  hideOnScrollUp?: boolean; // Hide when scrolling up (default: true)
  hideScrollThreshold?: number; // Threshold for hiding on scroll up (default: 50)
}

export const useScrollDetector = (options: UseScrollDetectorOptions = {}) => {
  const { 
    threshold = 3, 
    scrollThreshold = 100, 
    hideOnScrollUp = true,
    hideScrollThreshold = 50 
  } = options;
  
  const [isVisible, setIsVisible] = useState(false);
  const [scrollCount, setScrollCount] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollDifference = Math.abs(currentScrollY - lastScrollY);

    // Only process if scroll difference is significant enough
    if (scrollDifference < 5) return;

    // Determine scroll direction
    const direction = currentScrollY > lastScrollY ? 'down' : 'up';
    setScrollDirection(direction);

    // Hide on scroll up if enabled and bar is visible
    if (hideOnScrollUp && isVisible && direction === 'up' && scrollDifference >= hideScrollThreshold) {
      setIsVisible(false);
      setLastScrollY(currentScrollY);
      return;
    }

    // Show bar immediately on first significant scroll down (if scrolled past minimum threshold)
    if (direction === 'down' && !isVisible && currentScrollY >= scrollThreshold) {
      setIsVisible(true);
      setScrollCount(1);
    }
    // Or show after multiple smaller scrolls
    else if (direction === 'down' && scrollDifference >= 20) {
      setScrollCount(prevCount => {
        const newCount = prevCount + 1;
        if (newCount >= threshold && !isVisible) {
          setIsVisible(true);
        }
        return newCount;
      });
    }
    
    setLastScrollY(currentScrollY);
  }, [lastScrollY, scrollThreshold, threshold, isVisible, hideOnScrollUp, hideScrollThreshold]);

  useEffect(() => {
    let ticking = false;

    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Initial scroll position
    setLastScrollY(window.scrollY);

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, [handleScroll]);

  // Reset function to hide the bar and reset counters
  const resetVisibility = useCallback(() => {
    setIsVisible(false);
    setScrollCount(0);
    setLastScrollY(window.scrollY);
    setScrollDirection(null);
  }, []);

  // Force show function (optional utility)
  const forceShow = useCallback(() => {
    setIsVisible(true);
  }, []);

  // Force hide function (optional utility)
  const forceHide = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    scrollCount,
    scrollDirection,
    resetVisibility,
    forceShow,
    forceHide,
  };
};