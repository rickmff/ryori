import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Clock, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getMenu, getAvailability } from "@/lib/admin-store"
import type { MenuItemType } from "@/lib/admin-store"
import { ReservationForm } from "@/components/ReservationForm"
import { NavBar } from "@/components/NavBar"

function MenuItem({ item }: { item: MenuItemType }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">{item.name}</h3>
            {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
          </div>
          <span className="font-medium text-primary">€ {item.price.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function RestaurantePage() {
  const menu = getMenu()
  const availability = getAvailability()
  const whatsappNumber = process.env.WHATSAPP_NUMBER || "351928149095"

  const categorizedMenu = {
    entradas: menu.filter((item) => item.category === "entradas"),
    principais: menu.filter((item) => item.category === "principais"),
    sobremesas: menu.filter((item) => item.category === "sobremesas"),
    bebidas: menu.filter((item) => item.category === "bebidas"),
  }

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />

      <main className="flex-1">
        <section id="inicio" className="relative">
          <div className="relative h-[80vh] w-full overflow-hidden">
            <Image
              src="/ryori-hero.jpg"
              alt="Restaurante Ryōri"
              fill
              sizes="100vw"
              className="object-cover brightness-[0.7] blur-sm"
              priority
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gradient-to-b from-transparent to-background space-y-20">
              <h1 className="text-4xl md:text-7xl font-bold text-white">Ryōri</h1>
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

        <section id="reservas" className="py-16">
          <div className="container sm:max-w-2xl max-w-full">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Faça sua Reserva</h2>
              <p className="text-muted-foreground">
                Venha viajar connosco pelos sabores da cozinha tradicional Portuguesa e Japonesa reservando uma mesa conosco.
              </p>
            </div>

            <ReservationForm availability={availability} whatsappNumber={whatsappNumber} />
          </div>
        </section>
        {categorizedMenu.entradas.length > 0 ? (
          <section id="menu" className="py-16 bg-muted/50">
            <div className="container">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Menu</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Enaltecemos a cozinha Portuguesa com os melhores e mais frescos ingredientes em fusão com a alta cozinha Japonesa.
                </p>
              </div>

              <Tabs defaultValue="entradas" className="w-full max-w-4xl mx-auto">
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 mb-8">
                  <TabsTrigger value="entradas">Entradas</TabsTrigger>
                  <TabsTrigger value="principais">Principais</TabsTrigger>
                  <TabsTrigger value="sobremesas">Sobremesas</TabsTrigger>
                  <TabsTrigger value="bebidas">Bebidas</TabsTrigger>
                </TabsList>

                <TabsContent value="entradas" className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {categorizedMenu.entradas.map((item) => (
                    <MenuItem key={item.id} item={item} />
                  ))}

                </TabsContent>

                <TabsContent value="principais" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categorizedMenu.principais.length > 0 ? (
                    categorizedMenu.principais.map((item) => (
                      <MenuItem key={item.id} item={item} />
                    ))
                  ) : <p className="text-muted-foreground md:col-span-2">Sem pratos principais disponíveis no momento.</p>}
                </TabsContent>

                <TabsContent value="sobremesas" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categorizedMenu.sobremesas.length > 0 ? (
                    categorizedMenu.sobremesas.map((item) => (
                      <MenuItem key={item.id} item={item} />
                    ))
                  ) : <p className="text-muted-foreground md:col-span-2">Sem sobremesas disponíveis no momento.</p>}
                </TabsContent>

                <TabsContent value="bebidas" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categorizedMenu.bebidas.length > 0 ? (
                    categorizedMenu.bebidas.map((item) => (
                      <MenuItem key={item.id} item={item} />
                    ))
                  ) : <p className="text-muted-foreground md:col-span-2">Sem bebidas disponíveis no momento.</p>}
                </TabsContent>
              </Tabs>
            </div>
          </section>
        ) : null}

        <section id="local" className="py-16 bg-background">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Localização</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Estamos localizados em um ponto privilegiado, com fácil acesso.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="h-[400px] bg-muted rounded-lg overflow-hidden relative border">
                <Image src="/ryori-front.webp" alt="Restaurante Ryōri" fill className="object-cover brightness-[0.8]" />
              </div>

              <div className="flex flex-col justify-center space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-medium">Endereço</h3>
                      <p className="text-muted-foreground">PC Marquês de Pombal 2A</p>
                      <p className="text-muted-foreground">Setúbal, 2900-562</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-medium">Telefone</h3>
                      <p className="text-muted-foreground">+351 968 217 889</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-medium">Horário</h3>
                      {availability.length > 0 ? (
                        availability.map((day) => (
                          <p key={day.id} className="text-muted-foreground">
                            {day.name}: {day.enabled ? `${day.openTime} - ${day.closeTime}` : "Fechado"}
                          </p>
                        ))
                      ) : (
                        <p className="text-muted-foreground">Horários indisponíveis.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="outline" className="w-full sm:w-auto" asChild>
                    <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">
                      Ver no Google Maps
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Ryōri</h3>
              <p className="text-muted-foreground text-sm">
                Venha viajar connosco pelos sabores da cozinha tradicional Portuguesa e Japonesa             </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Contato</h3>
              <p>+351 968 217 889</p>
            </div>

            <div>
              <h3 className="text-md font-bold mb-4">Endereço</h3>
              <div className="space-y-1 text-muted-foreground text-sm">
                <p>PC Marquês de Pombal 2A</p>
                <p>Setúbal, 2900-562</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Siga-nos</h3>
              <div className="flex gap-3">
                <a
                  href="#"
                  aria-label="Instagram"
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-foreground"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
                </a>
                <a
                  href="#"
                  aria-label="Facebook"
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-foreground"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
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
