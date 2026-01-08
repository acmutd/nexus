import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = ({ message = "Refreshing...", detail = null }) => {
  return (
    <motion.div 
      className="fixed inset-0 backdrop-brightness-50 z-50 min-h-screen bg-gradient-to-br flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="bg-nexus50 p-8 rounded-lg shadow-lg text-center max-w-[30%]"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex flex-col items-center space-y-4">
          <img src='/assets/LoadingAnimation.gif' className='w-[20%] min-w-[90px]'/>
          <h2 className="bodyText font-titilliumWeb-semibold text-nexus-blue-800">{message}</h2>
          {detail ? <p className="text-nexus700">{detail}</p> : null}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;