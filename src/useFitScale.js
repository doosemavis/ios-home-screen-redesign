import { useEffect, useState } from 'react';

// Phone layout size in CSS px (iPhone 15 logical resolution).
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
// A real iPhone 15 is ~5.8in tall, about 740 CSS px on a MacBook at default display scaling.
const REAL_SIZE_HEIGHT = 740;
// Breathing room kept between the phone and the window edges (total per axis).
const VIEWPORT_MARGIN = 48;
const MIN_SCALE = 0.3;

const computeScale = () => {
  const realSize = REAL_SIZE_HEIGHT / PHONE_HEIGHT;
  const fitHeight = (window.innerHeight - VIEWPORT_MARGIN) / PHONE_HEIGHT;
  const fitWidth = (window.innerWidth - VIEWPORT_MARGIN) / PHONE_WIDTH;
  return Math.max(MIN_SCALE, Math.min(realSize, fitHeight, fitWidth));
};

// Scale factor that shows the phone at roughly real-world size, shrinking it to fit smaller windows.
export const useFitScale = () => {
  const [scale, setScale] = useState(computeScale);

  useEffect(() => {
    const handleResize = () => setScale(computeScale());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return scale;
};
