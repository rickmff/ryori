"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

export function MobileMenu() {
  // No complex state needed here if Sheet manages its own open/close state
  // If more complex state were needed (e.g., closing on navigation),
  // useState/useEffect could be added here.
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
          {/* You might want to pass links as props or define them here */}
          <a href="#inicio" className="text-lg font-medium hover:underline underline-offset-4 py-2">
            Início
          </a>
          <a href="#menu" className="text-lg font-medium hover:underline underline-offset-4 py-2">
            Menu
          </a>
          <a href="#reservations" className="text-lg font-medium hover:underline underline-offset-4 py-2">
            Reservas
          </a>
          <a href="#local" className="text-lg font-medium hover:underline underline-offset-4 py-2">
            Localização
          </a>
          <Button className="mt-4 bg-black text-white hover:bg-black/50 transition-all duration-300" asChild>
            <a href="#reservations">Reservar Mesa</a>
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  )
}