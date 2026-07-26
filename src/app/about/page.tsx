"use client";

import { motion } from "framer-motion";
import { DownloadCloud, Globe, ServerOff, Clock, FileText, ArrowRight, Share2, Link as LinkIcon, Edit3 } from "lucide-react";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function AboutPage() {
  const features = [
    {
      icon: <Edit3 className="w-8 h-8 text-blue-400" />,
      title: "Custom Room Creation",
      description: "Create ephemeral rooms with auto-generated names, or define your own custom name. Protect it with a secure password.",
      color: "bg-blue-500/10 border-blue-500/20"
    },
    {
      icon: <Globe className="w-8 h-8 text-indigo-400" />,
      title: "Easy Joining",
      description: "Simply share the room name and password. Anyone can instantly join from any device without needing to register or log in.",
      color: "bg-indigo-500/10 border-indigo-500/20"
    },
    {
      icon: <FileText className="w-8 h-8 text-amber-400" />,
      title: "Store Text & Files",
      description: "Share large files, images, code snippets, or text clips. Everything syncs in real-time across all connected devices.",
      color: "bg-amber-500/10 border-amber-500/20"
    },
    {
      icon: <Clock className="w-8 h-8 text-rose-400" />,
      title: "Auto-Destructing Rooms",
      description: "Set an expiry timer (24 hours to 30 days). Once the time is up, the room and all its contents are permanently deleted from the server.",
      color: "bg-rose-500/10 border-rose-500/20"
    },
    {
      icon: <Share2 className="w-8 h-8 text-emerald-400" />,
      title: "Direct Mode (P2P)",
      description: "Share massive, multi-gigabyte files instantly. Files stream directly between browsers over WebRTC—no file size limits.",
      color: "bg-emerald-500/10 border-emerald-500/20"
    },
    {
      icon: <ServerOff className="w-8 h-8 text-purple-400" />,
      title: "Zero Server Storage",
      description: "In Direct Mode, your files are never uploaded to our servers. When you close the tab, the transfer ends instantly, guaranteeing absolute privacy.",
      color: "bg-purple-500/10 border-purple-500/20"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <>
      <div className="flex-1 flex flex-col items-center p-4">
        <section className="w-full max-w-5xl mx-auto flex flex-col items-center text-center pt-12 pb-16 relative z-10">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 hover:bg-white/10 transition-colors text-sm font-medium text-white/80"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Back Home
          </Link>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 border border-primary/30 rotate-3"
          >
            <DownloadCloud className="w-10 h-10 text-primary" />

          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight font-outfit mb-6 bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent"
          >
            About FileDrop
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-white/60 max-w-3xl mb-4 leading-relaxed"
          >
            FileDrop is a modern, privacy-first file and text sharing application designed for absolute simplicity. No accounts, no subscriptions, and no tracking. Just instant, secure data transfers.
          </motion.p>
        </section>

        <section className="w-full max-w-6xl mx-auto py-12 relative z-10">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className={`glass-card p-8 flex flex-col items-start text-left border ${feature.color} hover:-translate-y-1 transition-transform duration-300`}
              >
                <div className={`p-4 rounded-2xl mb-6 ${feature.color.replace('border', 'bg').replace('/20', '/30')}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white/90 font-outfit">{feature.title}</h3>
                <p className="text-white/60 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="w-full max-w-4xl mx-auto py-20 text-center relative z-10">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5 }}
             className="glass-card p-12 bg-primary/5 border-primary/20"
           >
              <h2 className="text-3xl font-bold font-outfit text-white mb-4">Ready to start sharing?</h2>
              <p className="text-white/60 mb-8 max-w-xl mx-auto">
                 Experience the fastest way to move data across devices. Create a room now and see it in action.
              </p>
              <Link 
                href="/"
                className="glass-button inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 group"
              >
                Create Room
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
           </motion.div>
        </section>

        {/* Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[10%] left-[10%] w-[30%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />
        </div>
      </div>
      <Footer />
    </>
  );
}
