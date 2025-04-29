'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, UtensilsCrossed } from "lucide-react"
import AvailabilityEditor from "@/components/admin/AvailabilityEditor"
import MenuUploader from "@/components/admin/MenuUploader"

export function AdminTabs() {
  return (
    <Tabs defaultValue="menu" className="w-full">
      <TabsList className="grid w-full h-full max-w-sm grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <TabsTrigger value="menu" className="p-0">
          <div className="flex flex-col items-center justify-center gap-2 p-4 border rounded-md w-full h-full data-[state=active]:border-primary data-[state=active]:shadow-sm">
            <UtensilsCrossed className="h-6 w-6" />
            <span>Menu</span>
          </div>
        </TabsTrigger>
        <TabsTrigger value="availability" className="p-0">
          <div className="flex flex-col items-center justify-center gap-2 p-4 border rounded-md w-full h-full data-[state=active]:border-primary data-[state=active]:shadow-sm">
            <CalendarDays className="h-6 w-6" />
            <span>Reservas</span>
          </div>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="menu">
        <MenuUploader />
      </TabsContent>
      <TabsContent value="availability">
        <AvailabilityEditor />
      </TabsContent>
    </Tabs>
  )
}