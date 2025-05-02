"use client"

import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { MobileMenu } from "./MobileMenu";
import { Button } from "./ui/button";

export function NavBar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  // Update scroll state based on scroll position
  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <motion.header
      initial="initial"
      animate={scrolled ? "blur" : "initial"}
      className={`fixed top-0 py-4 z-50 w-full transition-all duration-300 ${scrolled ? "backdrop-blur-sm" : ""
        }`}
    >
      <div className="container flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-2">
          <motion.span animate={scrolled ? { opacity: 1 } : { opacity: 0 }}
            className="text-xl font-bold">Ryōri</motion.span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6 tracking-wide items-center">
          <motion.a
            href="/sobre"
            className="text-sm font-medium"
            initial="rest"
            whileHover="hover"
          >
            Sobre
          </motion.a>
          {["Menu", "Location"].map((item) => (
            <motion.a
              key={item}
              href={`/#${item.toLowerCase()}`}
              className="text-sm font-medium"
              initial="rest"
              whileHover="hover"
            >
              {item}
            </motion.a>
          ))}
          <Button asChild size="sm" className="bg-black text-white hover:bg-black/50 transition-all duration-300">
            <a href="#reservations">Reservar Mesa</a>
          </Button>
        </nav>

        {/* Mobile Menu Trigger */}
        <motion.div
          className="md:hidden flex items-center"
        >
          <MobileMenu />
        </motion.div>
      </div>
    </motion.header >
  );
}
