import { motion } from "framer-motion";
import { Link } from "wouter";
import { Bot, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-24 h-24 rounded-3xl bg-discord-blurple/20 flex items-center justify-center mx-auto mb-6 border border-discord-blurple/30">
          <Bot size={44} className="text-discord-blurple/50" />
        </div>
        <h1 className="text-6xl font-black text-white mb-3">404</h1>
        <p className="text-discord-light text-lg mb-8">This page doesn't exist</p>
        <Link href="/">
          <motion.div
            whileHover={{ scale: 1.04 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-discord-blurple hover:bg-[#4752c4] text-white font-bold cursor-pointer transition-colors"
          >
            <Home size={18} />
            Go Home
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
