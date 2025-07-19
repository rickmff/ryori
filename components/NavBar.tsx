"use client"

import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { MobileMenu } from "./MobileMenu";
import { Button } from "./ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Update scroll state based on scroll position
  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  const items = [
    { label: "Sobre", href: "/sobre" },
    { label: "Menu", href: pathname === "/" ? "#menu" : "/#menu" },
    { label: "Location", href: pathname === "/" ? "#location" : "/#location" }
  ];

  return (
    <motion.header
      initial="initial"
      animate={scrolled ? "blur" : "initial"}
      className={`fixed top-0 py-4 z-50 w-full transition-all duration-300 ${scrolled ? "backdrop-blur-sm" : ""
        }`}
    >
      <div className="container flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-2">
          <Link href="/">
            <motion.span
              animate={scrolled ? { opacity: 1 } : { opacity: 0 }}
              className="text-xl font-bold cursor-pointer"
            >
              Ryōri
            </motion.span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6 tracking-wide items-center">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-md tracking-wider hover:opacity-80 hover:underline underline-offset-4 transition-all duration-500"
            >
              {item.label}
            </Link>
          ))}
          <Button asChild size="sm" className="bg-black text-white hover:bg-black/50 transition-all duration-300">
            <Link href={pathname === "/" ? "#reservations" : "/#reservations"}>Reservar Mesa</Link>
          </Button>
        </nav>

        {/* Mobile Menu Trigger */}
        <motion.div
          className="md:hidden flex items-center"
        >
          <MobileMenu />
        </motion.div>
      </div>
    </motion.header>
  );
}
