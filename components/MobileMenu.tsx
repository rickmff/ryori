"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function MobileMenu() {
  const pathname = usePathname();

  const items = [
    { label: "Início", href: pathname === "/" ? "#inicio" : "/#inicio" },
    { label: "Sobre", href: "/sobre" },
    { label: "Menu", href: pathname === "/" ? "#menu" : "/#menu" },
    { label: "Reservas", href: pathname === "/" ? "#reservations" : "/#reservations" },
    { label: "Localização", href: pathname === "/" ? "#local" : "/#local" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[80%] sm:w-[350px]">
        <nav className="flex flex-col gap-4 mt-8">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-lg font-medium hover:underline underline-offset-4 py-2"
            >
              {item.label}
            </Link>
          ))}
          <Button className="mt-4 bg-black text-white hover:bg-black/50 transition-all duration-300" asChild>
            <Link href={pathname === "/" ? "#reservations" : "/#reservations"}>
              Reservar Mesa
            </Link>
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  )
}