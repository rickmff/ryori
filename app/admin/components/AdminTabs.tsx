'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, UtensilsCrossed } from "lucide-react"
import AvailabilityEditor from "@/components/admin/AvailabilityEditor"
import MenuUploader from "@/components/admin/MenuUploader"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function AdminTabs() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") ?? "menu"

  const handleValueChange = (value: string) => {
    router.push(`${pathname}?tab=${value}`)
  }

  return (
    <Tabs
      value={currentTab}
      onValueChange={handleValueChange}
      className="w-full"
    >
      <TabsList className="w-full h-full md:w-1/3 gap-4 mb-8">
        <TabsTrigger value="menu" className="p-0 w-full">
          <div className="flex flex-col items-center justify-center gap-2 p-4 border rounded-md w-full h-full data-[state=active]:border-primary data-[state=active]:shadow-sm">
            <UtensilsCrossed className="h-6 w-6" />
            <span>Menu</span>
          </div>
        </TabsTrigger>
        <TabsTrigger value="availability" className="p-0 w-full">
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