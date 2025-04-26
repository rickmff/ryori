// Tipos
export type MenuItemType = {
  id: string
  name: string
  description: string
  price: number
  category: string
}

export type TimeSlotType = {
  id: string
  time: string
  available: boolean
}

export type DayAvailabilityType = {
  id: string
  name: string
  enabled: boolean
  openTime: string
  closeTime: string
  timeSlots: TimeSlotType[]
}

// Funções para gerenciar o menu
export function getMenu(): MenuItemType[] {
  if (typeof window === "undefined") return []

  const savedMenu = localStorage.getItem("restaurantMenu")
  if (savedMenu) {
    return JSON.parse(savedMenu)
  }
  return []
}

export function saveMenu(menu: MenuItemType[]): void {
  if (typeof window === "undefined") return

  localStorage.setItem("restaurantMenu", JSON.stringify(menu))
}

// Funções para gerenciar a disponibilidade
export function getAvailability(): DayAvailabilityType[] {
  if (typeof window === "undefined") return []

  const savedAvailability = localStorage.getItem("restaurantAvailability")
  if (savedAvailability) {
    return JSON.parse(savedAvailability)
  }
  return []
}

export function saveAvailability(availability: DayAvailabilityType[]): void {
  if (typeof window === "undefined") return

  localStorage.setItem("restaurantAvailability", JSON.stringify(availability))
}

// Função para verificar autenticação
export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false

  return localStorage.getItem("adminAuthenticated") === "true"
}

export function setAdminAuthenticated(authenticated: boolean): void {
  if (typeof window === "undefined") return

  if (authenticated) {
    localStorage.setItem("adminAuthenticated", "true")
  } else {
    localStorage.removeItem("adminAuthenticated")
  }
}
