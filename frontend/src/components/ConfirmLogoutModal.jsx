import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HiX } from 'react-icons/hi';
import Button from './Button';

export default function ConfirmLogoutModal({ isOpen, onClose, onConfirm, busy = false }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[1200]"
          style={{ backgroundColor: 'rgba(0, 13, 33, .9)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ duration: 0.2 }}
            className="bg-nexus800 rounded-lg p-8 w-[420px] shadow-xl relative mx-10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-logout-title"
          >
            <HiX
              onClick={() => { if (!busy) onClose(); }}
              className="text-white absolute right-5 top-5 cursor-pointer hover:text-gray-400 transition duration-300"
              size={22}
              aria-label="Close"
            />

            <h2 id="confirm-logout-title" className="bodyText text-nexus200 font-titilliumWeb-bold mb-1">
              Logout Confirmation
            </h2>
            <p className="text-nexus200 mb-4 tinyText">
              Are you sure you want to logout?
            </p>

            <div className="flex gap-3 mt-4">
              <div className="w-1/2">
                <Button
                  className="bg-nexus600 w-full"
                  onClick={busy ? undefined : onClose}
                  text="Cancel"
                  disabled={busy}
                />
              </div>
              <div className="w-1/2">
                <Button
                  className="bg-red-500 w-full"
                  onClick={busy ? undefined : onConfirm}
                  text={busy ? 'Logging out...' : 'Logout'}
                  disabled={busy}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
