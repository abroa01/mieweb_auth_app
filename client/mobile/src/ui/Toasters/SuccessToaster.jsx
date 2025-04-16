import React, { useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";

const SuccessToaster = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "150%" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed top-5 right-5 bg-green-500 text-white px-4 py-2 rounded shadow-lg"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuccessToaster;
