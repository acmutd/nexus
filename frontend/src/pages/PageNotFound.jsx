import React from "react";
import {Link} from "react-router-dom";
import {motion} from "framer-motion";

const PageNotFound = () => {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-nexus900">
            <motion.div
                initial={{opacity: 0, y: 24}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.35, ease: "easeOut"}}
                className="w-full max-w-2xl px-8 py-16 text-center"
            >
                <div className="mb-6 text-nexus400 text-sm tracking-wide uppercase">
                    Nexus
                </div>

                <h1 className="text-7xl font-titilliumWeb-semibold text-white mb-4">
                    404
                </h1>

                <h2 className="text-2xl text-white mb-4">
                    Page not found
                </h2>

                <p className="text-gray-300 max-w-md mx-auto mb-10 leading-relaxed">
                    The page you’re looking for doesn’t exist or may have been moved.
                    If you followed a link, it might be outdated.
                </p>

                <div className="flex justify-center gap-4">
                    <Link
                        to="/"
                        className="px-6 py-2 rounded-lg bg-nexus600 hover:bg-nexus500
              text-white font-titilliumWeb-semibold transition-all
              active:scale-95"
                    >
                        Go home
                    </Link>

                    <button
                        onClick={() => window.history.back()}
                        className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10
              text-white font-titilliumWeb-semibold transition-all
              border border-white/10 active:scale-95"
                    >
                        Go back
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default PageNotFound;
