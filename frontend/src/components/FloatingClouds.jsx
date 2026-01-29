import React from 'react';
import { motion } from 'framer-motion';

const FloatingClouds = () => {
  // Cloud configurations for seamless looping
  const clouds = [
    {
      name: 'cloud1',
      path: '/assets/LoginPipelineAssets/LoginPipelineCloud1.svg',
      width: 400,
      yPosition: '5%',
      duration: 60,
      delay: 0,
      opacity: 0.9
    },
    {
      name: 'cloud2',
      path: '/assets/LoginPipelineAssets/LoginPipelineCloud4.svg',
      width: 400,
      yPosition: '35%',
      duration: 75,
      delay: 15,
      opacity: 0.85
    },
    {
      name: 'cloud3',
      path: '/assets/LoginPipelineAssets/LoginPipelineCloud3.svg',
      width: 400,
      yPosition: '60%',
      duration: 85,
      delay: 25,
      opacity: 0.8
    },
    {
      name: 'cloud4',
      path: '/assets/LoginPipelineAssets/LoginPipelineCloud4.svg',
      width: 400,
      yPosition: '85%',
      duration: 55,
      delay: 35,
      opacity: 0.88
    }
  ];

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {clouds.map((cloud, index) => (
        <React.Fragment key={index}>
          {/* First instance of the cloud */}
          <Cloud {...cloud} instanceId={`${cloud.name}-1`} />
          {/* Second instance for seamless loop */}
          <Cloud {...cloud} instanceId={`${cloud.name}-2`} isSecondInstance={true} />
        </React.Fragment>
      ))}
    </div>
  );
};

const Cloud = ({ path, width, yPosition, duration, delay, opacity, instanceId, isSecondInstance = false }) => {
  // Calculate the starting position
  // First instance starts off-screen to the left
  // Second instance starts exactly one screen width behind
  const startX = isSecondInstance ? '100vw' : '100%';
  
  return (
    <motion.div
    className='will-change-transform pointer-events-none fixed'
      style={{
        top: yPosition,
        right: startX,
        width: `${width}px`,
      }}
      initial={{ x: 0 }}
      animate={{
        x: isSecondInstance 
          ? [0, -(typeof window !== 'undefined' ? window.innerWidth : 1920) - width] 
          : [0, (typeof window !== 'undefined' ? window.innerWidth : 1920) + width]
      }}
      transition={{
        duration: duration,
        delay: delay,
        repeat: Infinity,
        ease: "linear",
        repeatDelay: 0
      }}
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 4 + Math.random() * 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <img 
          src={path} 
          alt={`Cloud ${instanceId}`}
          className="w-full h-auto"
        />
      </motion.div>
    </motion.div>
  );
};

export default FloatingClouds;