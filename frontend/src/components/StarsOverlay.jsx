import { useMemo } from 'react';
import './StarsOverlay.css';

const SMALL_STAR_ASSETS = [
  '/assets/stars/star1.svg',
  '/assets/stars/star2.svg',
];

const BIG_STAR_ASSETS = [
  '/assets/stars/star3.svg',
  '/assets/stars/star4.svg',
];

const defaultSmallSize = [4, 8]; // px range (min, max) for small stars
const defaultBigSize = [8, 14];  // px range (min, max) for big stars
const defaultSmallDuration = [18, 8]; // [base, random] seconds for small stars
const defaultBigDuration = [23, 10];  // [base, random] seconds for big stars

/**
 * Lightweight full-screen overlay that drifts a pool of SVG stars upward.
 * Keeps everything CSS-driven and pointer-event free to avoid layout interference.
 * Sizes are tunable via smallSize / bigSize props (each [minPx, maxPx]).
 */
export default function StarsOverlay({
  count = 42,
  allowDepthBlur = false,
  bigWeight = 0.2,
  smallSize = defaultSmallSize,
  bigSize = defaultBigSize,
  smallDuration = defaultSmallDuration,
  bigDuration = defaultBigDuration,
}) {
  const stars = useMemo(() => {
    return Array.from({ length: count }).map((_, idx) => {
      const useBig = Math.random() < bigWeight && BIG_STAR_ASSETS.length;
      const assetPool = useBig && BIG_STAR_ASSETS.length ? BIG_STAR_ASSETS : SMALL_STAR_ASSETS;
      const [minSize, maxSize] = useBig ? bigSize : smallSize;
      const size = minSize + Math.random() * Math.max(maxSize - minSize, 0); // px
      const [baseDur, randDur] = useBig ? bigDuration : smallDuration;
      const duration = baseDur + Math.random() * randDur; // seconds
      const startOffset = Math.random() * duration; // start mid-cycle so stars move immediately
      const startY =
        Math.random() < 0.65
          ? 100 + Math.random() * 60 // majority spawn below viewport (100–160vh)
          : Math.random() * 110 - 10; // some start in/near view (-10–110vh)
      return {
        id: idx,
        left: Math.random() * 100, // vw
        duration,
        delay: -startOffset, // negative delay starts animation already in motion
        svg: assetPool[Math.floor(Math.random() * assetPool.length)],
        size,
        opacity: 0.6 + Math.random() * 0.35,
        blur: allowDepthBlur && Math.random() > 0.7 ? (0.6 + Math.random() * 1.2) : 0,
        xDrift: (Math.random() - 0.5) * 30, // px drift left/right
        startY, // vh; weighted to spawn more from below while keeping a few in view
      };
    });
  }, [count, allowDepthBlur, bigWeight]);

  return (
    <div className="stars-overlay">
      {stars.map((star) => (
        <img
          key={star.id}
          src={star.svg}
          alt=""
          className="star"
          style={{
            left: `${star.left}vw`,
            top: `${star.startY}vh`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
            opacity: star.opacity,
            filter: star.blur ? `blur(${star.blur}px)` : 'none',
            '--x-drift': `${star.xDrift}px`,
          }}
        />
      ))}
    </div>
  );
}
