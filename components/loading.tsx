"use client"

import { motion } from "framer-motion"

export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-neutral-800">
      {/* Animated Spinner */}
      <motion.div
        className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />

      {/* Loading Text */}
      <motion.p
        className="mt-4 text-gray-600 text-lg font-medium"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        Loading, please wait...
      </motion.p>
    </div>
  )
}