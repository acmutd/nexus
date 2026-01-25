import React from "react";
import SuperDoc from "./SuperDoc";

import { motion } from "framer-motion";

const UnderConstruction = () => {
    return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div className="absolute inset-0 z-0">
        <SuperDoc />
      </div>
      <div className="absolute inset-0 backdrop-blur-md bg-black/40" />

      <div className="absolute inset-0 bg-black/40" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-[90%] max-w-md rounded-xl bg-gradient-to-b from-nexus800 to-nexus900
                   p-8 shadow-2xl text-center"
      >
        <h1 className="text-3xl text-white mb-3">
          Under construction! 
          <br />
          Come back soon!
        </h1>
        <div className="flex justify-center mb-6">
          <img
            src="/assets/UnderConstructionIcon.svg"
            alt="Maintenance illustration"
            className="w-70 h-35"
            />
        </div>


      </motion.div>
    </div>
  );
}

export default UnderConstruction;