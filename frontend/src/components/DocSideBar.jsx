import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineDocument, HiUpload, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';


const DocSideBar = () => {
 const navigate = useNavigate();
 const [isCollapsed, setIsCollapsed] = useState(false);

 const units = [1, 2, 3 ,4]

 const handleUploadClick = () => {
   navigate('/upload');
 };


 const toggleSidebar = () => {
   setIsCollapsed(!isCollapsed);
 };


 const sidebarVariants = {
   expanded: { width: 256 },
   collapsed: { width: 32 },
 };


 return (
   <motion.aside
     className="shadow-md flex flex-col h-screen fixed left-0 top-0 pt-16 overflow-visible z-40"
     initial="expanded"
     animate={isCollapsed ? "collapsed" : "expanded"}
     variants={sidebarVariants}
     transition={{ type: "tween", duration: 0.4 }}
     style={{backgroundImage: isCollapsed ? 'linear-gradient(#002966, #002966)' : 'linear-gradient(#002966, #001433)'}}
   >
     <button
       onClick={toggleSidebar}
       className="absolute top-20 -right-6 bg-nexus600 text-white p-2 rounded-r-md z-50 shadow-md cursor-pointer"
     >
       {isCollapsed ? <HiChevronRight size={20} /> : <HiChevronLeft size={20} />}
     </button>
     <AnimatePresence>
       {!isCollapsed && (
         <motion.div
           className="flex-1 overflow-y-auto p-4"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.3 }}
         >
           <h2 className="text-2xl font-bold text-nexus100 mb-4">Units</h2>
           <ul className="space-y-2">
             {units.map((unit, index) => (
               <motion.li
                 key={index}
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ duration: 0.3, delay: index * 0.05 }}
               >
                 <button
                   className={`bg-nexus900 flex items-center w-full p-1 rounded hover:bg-nexus700 text-nexus200 hover:text-white transition-colors duration-200`}
                 >
                   <HiOutlineDocument className="mr-2" />
                   {unit}
                 </button>
               </motion.li>
             ))}
           </ul>
         </motion.div>
       )}
     </AnimatePresence>
     <motion.div
       className="p-4 mt-auto"
       initial={{ opacity: 1 }}
       animate={{ opacity: isCollapsed ? 0 : 1 }}
       transition={{ duration: 0.3 }}
     >
       <button
         onClick={handleUploadClick}
         className="flex items-center justify-center w-full bg-nexus600 text-white py-2 px-4 rounded-md hover:bg-nexus-blue-500 transition-colors duration-200"
       >
         <HiUpload className="mr-2" />
         Upload Document
       </button>
     </motion.div>
   </motion.aside>
 );
};


export default DocSideBar;