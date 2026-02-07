import { useMemo } from 'react';
import './StarFieldOverlay.css';

const SMALL_STAR_ASSETS = [
  '/assets/stars/star1.svg',
  '/assets/stars/star2.svg',
];

const BIG_STAR_ASSETS = [
  '/assets/stars/star3.svg',
  '/assets/stars/star4.svg',
];

const defaultSmallSize = [3, 7];
const defaultBigSize = [6, 12];
// Faster twinkle + bigger drift for a more active field
const defaultSmallTwinkle = [2.0, 0.9]; // [base, random] seconds
const defaultBigTwinkle = [3.0, 1.1];

/**
 * Static star field: stars gently drift + twinkle but do not move upward.
 * Designed to be swappable with StarsOverlay without changing assets.
 */
export default function StarFieldOverlay({
  count = 80,
  bigWeight = 0.15,
  smallSize = defaultSmallSize,
  bigSize = defaultBigSize,
  smallTwinkle = defaultSmallTwinkle,
  bigTwinkle = defaultBigTwinkle,
  allowDepthBlur = false,
}) {
  const stars = useMemo(() => {
    return Array.from({ length: count }).map((_, idx) => {
      const useBig = Math.random() < bigWeight && BIG_STAR_ASSETS.length;
      const assetPool = useBig ? BIG_STAR_ASSETS : SMALL_STAR_ASSETS;
      const [minSize, maxSize] = useBig ? bigSize : smallSize;
      const size = minSize + Math.random() * Math.max(maxSize - minSize, 0);
      const [baseTwinkle, randTwinkle] = useBig ? bigTwinkle : smallTwinkle;
      const twinkle = baseTwinkle + Math.random() * randTwinkle;
      return {
        id: idx,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size,
        svg: assetPool[Math.floor(Math.random() * assetPool.length)],
        opacity: 0.55 + Math.random() * 0.4,
        blur: allowDepthBlur && Math.random() > 0.7 ? (0.5 + Math.random() * 1.0) : 0,
        driftX: (Math.random() - 0.5) * 45, // px, wider sway
        driftY: (Math.random() - 0.5) * 24, // px, wider sway
        twinkle,
        delay: -Math.random() * twinkle, // start mid-cycle
      };
    });
  }, [count, bigWeight, smallSize, bigSize, smallTwinkle, bigTwinkle, allowDepthBlur]);

  return (
    <div className="starfield-overlay">
      {stars.map((star) => (
        <img
          key={star.id}
          src={star.svg}
          alt=""
          className="starfield-star"
          style={{
            left: `${star.left}vw`,
            top: `${star.top}vh`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            filter: star.blur ? `blur(${star.blur}px)` : 'none',
            '--drift-x': `${star.driftX}px`,
            '--drift-y': `${star.driftY}px`,
            animationDuration: `${star.twinkle}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
