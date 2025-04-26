"use client"

import { useState } from "react"

import { useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Clock, Phone, Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import Image from "next/image"
import { getMenu, getAvailability } from "@/lib/admin-store"
import type { MenuItemType, DayAvailabilityType, TimeSlotType } from "@/lib/admin-store"

export default function RestaurantePage() {
  const [menuItems, setMenuItems] = useState<{
    entradas: MenuItemType[]
    principais: MenuItemType[]
    sobremesas: MenuItemType[]
    bebidas: MenuItemType[]
  }>({
    entradas: [],
    principais: [],
    sobremesas: [],
    bebidas: [],
  })

  const [availability, setAvailability] = useState<DayAvailabilityType[]>([])
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedDay, setSelectedDay] = useState<DayAvailabilityType | null>(null)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlotType[]>([])
  const [selectedTime, setSelectedTime] = useState<string>("")

  // Add state for reservation form fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [guests, setGuests] = useState("")
  const [notes, setNotes] = useState("")

  // Carregar dados do menu e disponibilidade
  useEffect(() => {
    const menu = getMenu()
    if (menu.length > 0) {
      const categorizedMenu = {
        entradas: menu.filter((item) => item.category === "entradas"),
        principais: menu.filter((item) => item.category === "principais"),
        sobremesas: menu.filter((item) => item.category === "sobremesas"),
        bebidas: menu.filter((item) => item.category === "bebidas"),
      }
      setMenuItems(categorizedMenu)
    }

    const avail = getAvailability()
    if (avail.length > 0) {
      setAvailability(avail)
    }
  }, [])

  // Atualizar dia selecionado quando a data mudar
  useEffect(() => {
    if (date && availability.length > 0) {
      const dayOfWeek = date.getDay()
      // Converter de 0-6 (domingo-sábado) para 7,1-6 (domingo=7, segunda=1, etc.)
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const selectedDay = availability[dayIndex]
      setSelectedDay(selectedDay)

      if (selectedDay && selectedDay.enabled) {
        setAvailableTimeSlots(selectedDay.timeSlots.filter((slot) => slot.available))
      } else {
        setAvailableTimeSlots([])
      }

      setSelectedTime("")
    }
  }, [date, availability])

  // Function to handle reservation and redirect to WhatsApp
  const handleReservation = () => {
    if (!date || !selectedTime || !guests || !name) {
      // Basic validation: ensure required fields are filled
      alert("Por favor, preencha nome, data, horário e número de pessoas.")
      return
    }

    const formattedDate = date.toLocaleDateString("pt-PT") // Format date as dd/mm/yyyy for Portugal

    const message = `Olá, gostaria de fazer uma reserva:\n\nNome: ${name}\nEmail: ${email || "Não informado"}\nTelefone: ${phone || "Não informado"}\nData: ${formattedDate}\nHorário: ${selectedTime}\nPessoas: ${guests}\nObservações: ${notes || "Nenhuma"}`

    const whatsappNumber = "351928149095" // Remove '+' and spaces
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`

    // Redirect user to WhatsApp
    window.location.href = whatsappUrl
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Ryōri</span>
          </div>

          {/* Menu para desktop */}
          <nav className="hidden md:flex gap-6">
            <a href="#inicio" className="text-sm font-medium hover:underline underline-offset-4">
              Início
            </a>
            <a href="#menu" className="text-sm font-medium hover:underline underline-offset-4">
              Menu
            </a>
            <a href="#reservas" className="text-sm font-medium hover:underline underline-offset-4">
              Reservas
            </a>
            <a href="#local" className="text-sm font-medium hover:underline underline-offset-4">
              Localização
            </a>
          </nav>

          {/* Botão de reserva para desktop */}
          <div className="hidden md:block">
            <Button asChild>
              <a href="#reservas">Reservar Mesa</a>
            </Button>
          </div>

          {/* Menu móvel */}
          <div className="md:hidden flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80%] sm:w-[350px]">
                <nav className="flex flex-col gap-4 mt-8">
                  <a href="#inicio" className="text-lg font-medium hover:underline underline-offset-4 py-2">
                    Início
                  </a>
                  <a href="#menu" className="text-lg font-medium hover:underline underline-offset-4 py-2">
                    Menu
                  </a>
                  <a href="#reservas" className="text-lg font-medium hover:underline underline-offset-4 py-2">
                    Reservas
                  </a>
                  <a href="#local" className="text-lg font-medium hover:underline underline-offset-4 py-2">
                    Localização
                  </a>
                  <Button className="mt-4" asChild>
                    <a href="#reservas">Reservar Mesa</a>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section id="inicio" className="relative">
          <div className="relative h-[70vh] w-full overflow-hidden">
            <Image
              src="/ryori-hero.jpg"
              alt="Restaurante Ryōri"
              fill
              className="object-cover brightness-[0.7]"
              priority
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">Ryōri</h1>
              <p className="text-xl md:text-2xl text-white max-w-2xl mb-8">
                Uma experiência gastronômica única com os melhores sabores da culinária contemporânea
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <a href="#reservas">Reservar Mesa</a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 text-white border-white hover:bg-white/20"
                  asChild
                >
                  <a href="#menu">Ver Menu</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Menu Section */}
        <section id="menu" className="py-16 bg-muted/50">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Nosso Menu</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Descubra nossa seleção de pratos preparados com ingredientes frescos e técnicas refinadas
              </p>
            </div>

            <Tabs defaultValue="entradas" className="w-full max-w-4xl mx-auto">
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 mb-8">
                <TabsTrigger value="entradas">Entradas</TabsTrigger>
                <TabsTrigger value="principais">Principais</TabsTrigger>
                <TabsTrigger value="sobremesas">Sobremesas</TabsTrigger>
                <TabsTrigger value="bebidas">Bebidas</TabsTrigger>
              </TabsList>

              <TabsContent value="entradas" className="space-y-4">
                {menuItems.entradas.map((item, index) => (
                  <MenuItem key={index} item={item} />
                ))}
              </TabsContent>

              <TabsContent value="principais" className="space-y-4">
                {menuItems.principais.map((item, index) => (
                  <MenuItem key={index} item={item} />
                ))}
              </TabsContent>

              <TabsContent value="sobremesas" className="space-y-4">
                {menuItems.sobremesas.map((item, index) => (
                  <MenuItem key={index} item={item} />
                ))}
              </TabsContent>

              <TabsContent value="bebidas" className="space-y-4">
                {menuItems.bebidas.map((item, index) => (
                  <MenuItem key={index} item={item} />
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Reservas Section */}
        <section id="reservas" className="py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Faça sua Reserva</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Reserve sua mesa e garanta uma experiência gastronômica inesquecível
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-card p-6 rounded-lg border">
                <form className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Nome completo
                    </label>
                    <Input
                      id="name"
                      placeholder="Seu nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      E-mail
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">
                      Telefone
                    </label>
                    <Input
                      id="phone"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data</label>
                    <Calendar mode="single" selected={date} onSelect={setDate} className="border rounded-md" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="time" className="text-sm font-medium">
                        Horário
                      </label>
                      <Select value={selectedTime} onValueChange={setSelectedTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {!selectedDay || !selectedDay.enabled ? (
                            <SelectItem value="indisponivel" disabled>
                              Dia indisponível
                            </SelectItem>
                          ) : availableTimeSlots.length === 0 ? (
                            <SelectItem value="indisponivel" disabled>
                              Sem horários disponíveis
                            </SelectItem>
                          ) : (
                            availableTimeSlots.map((slot) => (
                              <SelectItem key={slot.id} value={slot.time}>
                                {slot.time}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="guests" className="text-sm font-medium">
                        Pessoas
                      </label>
                      <Select value={guests} onValueChange={setGuests} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 pessoa</SelectItem>
                          <SelectItem value="2">2 pessoas</SelectItem>
                          <SelectItem value="3">3 pessoas</SelectItem>
                          <SelectItem value="4">4 pessoas</SelectItem>
                          <SelectItem value="5">5 pessoas</SelectItem>
                          <SelectItem value="6">6 pessoas</SelectItem>
                          <SelectItem value="7">7 pessoas</SelectItem>
                          <SelectItem value="8">8 pessoas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="notes" className="text-sm font-medium">
                      Observações especiais
                    </label>
                    <Textarea
                      id="notes"
                      placeholder="Alergias, preferências, ocasiões especiais, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <Button type="button" className="w-full" onClick={handleReservation}>
                    Confirmar Reserva via WhatsApp
                  </Button>
                </form>
              </div>

              <div className="flex flex-col justify-center space-y-6">
                <div className="bg-muted p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Horário de Funcionamento</h3>
                  <div className="space-y-2">
                    {availability.map((day) => (
                      <div key={day.id} className="flex justify-between">
                        <span>{day.name}</span>
                        <span>{day.enabled ? `${day.openTime} - ${day.closeTime}` : "Fechado"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-muted p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Informações Importantes</h3>
                  <ul className="space-y-2 list-disc pl-5">
                    <li>Reservas podem ser feitas com até 30 dias de antecedência</li>
                    <li>Para grupos acima de 8 pessoas, entre em contato por telefone</li>
                    <li>Cancelamentos devem ser feitos com 24h de antecedência</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Local Section */}
        <section id="local" className="py-16 bg-muted/50">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Nossa Localização</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Estamos localizados em um ponto privilegiado da cidade, com fácil acesso e estacionamento
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="h-[400px] bg-muted rounded-lg overflow-hidden relative">
                <Image
                  src="/placeholder.svg?height=400&width=600"
                  alt="Mapa do restaurante"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-medium bg-background/80 p-4 rounded-md">Mapa do Restaurante</span>
                </div>
              </div>

              <div className="flex flex-col justify-center space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <h3 className="font-medium">Endereço</h3>
                      <p className="text-muted-foreground">Av. Paulista, 1000 - Bela Vista</p>
                      <p className="text-muted-foreground">São Paulo - SP, 01310-100</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <h3 className="font-medium">Telefone</h3>
                      <p className="text-muted-foreground">(11) 3456-7890</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <h3 className="font-medium">Horário de Funcionamento</h3>
                      {availability.map((day) => (
                        <p key={day.id} className="text-muted-foreground">
                          {day.name}: {day.enabled ? `${day.openTime} - ${day.closeTime}` : "Fechado"}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="font-medium mb-2">Como Chegar</h3>
                  <p className="text-muted-foreground mb-4">
                    Estamos a 5 minutos da estação de metrô Trianon-Masp. Estacionamento disponível no local com
                    manobrista.
                  </p>
                  <Button variant="outline" className="w-full sm:w-auto">
                    Ver no Google Maps
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Ryōri</h3>
              <p className="text-muted-foreground">
                Uma experiência gastronômica única com os melhores sabores da culinária contemporânea.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Contato</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>Av. Paulista, 1000 - Bela Vista</p>
                <p>São Paulo - SP, 01310-100</p>
                <p>(11) 3456-7890</p>
                <p>contato@saborarte.com.br</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Siga-nos</h3>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80"
                >
                  <span className="sr-only">Instagram</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                  </svg>
                </a>
                <a
                  href="#"
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80"
                >
                  <span className="sr-only">Facebook</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </a>
                <a
                  href="#"
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80"
                >
                  <span className="sr-only">Twitter</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Ryōri. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Componente para item do menu
function MenuItem({ item }: { item: MenuItemType }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">{item.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
          </div>
          <span className="font-medium text-primary">R$ {item.price.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
