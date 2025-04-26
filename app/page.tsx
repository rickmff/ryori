import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Clock, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getMenu, getAvailability } from "@/lib/admin-store"
import type { MenuItemType } from "@/lib/admin-store"
import { ReservationForm } from "@/components/ReservationForm"
import { MobileMenu } from "@/components/MobileMenu"

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
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Ryōri</span>
          </div>

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

          <div className="hidden md:block">
            <Button asChild>
              <a href="#reservas">Reservar Mesa</a>
            </Button>
          </div>

          <div className="md:hidden flex items-center">
            <MobileMenu />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section id="inicio" className="relative">
          <div className="relative h-[70vh] w-full overflow-hidden">
            <Image
              src="/ryori-hero.jpg"
              alt="Restaurante Ryōri"
              fill
              sizes="100vw"
              className="object-cover brightness-[0.7]"
              priority
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-black/30">
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

              <TabsContent value="entradas" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categorizedMenu.entradas.length > 0 ? (
                  categorizedMenu.entradas.map((item) => (
                    <MenuItem key={item.id} item={item} />
                  ))
                ) : <p className="text-muted-foreground md:col-span-2">Sem entradas disponíveis no momento.</p>}
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

        <section id="reservas" className="py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Faça sua Reserva</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Reserve sua mesa e garanta uma experiência gastronômica inesquecível
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <ReservationForm availability={availability} whatsappNumber={whatsappNumber} />

              <div className="flex flex-col justify-start space-y-6 pt-6 md:pt-0">
                <div className="bg-muted p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Horário de Funcionamento</h3>
                  <div className="space-y-2">
                    {availability.length > 0 ? (
                      availability.map((day) => (
                        <div key={day.id} className="flex justify-between">
                          <span>{day.name}</span>
                          <span>{day.enabled ? `${day.openTime} - ${day.closeTime}` : "Fechado"}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">Horários indisponíveis.</p>
                    )}
                  </div>
                </div>

                <div className="bg-muted p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Informações Importantes</h3>
                  <ul className="space-y-2 list-disc pl-5 text-muted-foreground">
                    <li>Reservas podem ser feitas com até 30 dias de antecedência</li>
                    <li>Para grupos acima de 8 pessoas, entre em contato por telefone</li>
                    <li>Cancelamentos devem ser feitos com 24h de antecedência</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="local" className="py-16 bg-muted/50">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Nossa Localização</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Estamos localizados em um ponto privilegiado, com fácil acesso.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="h-[400px] bg-muted rounded-lg overflow-hidden relative border">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.0000000000005!2d-9.13333!3d38.71667!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd1931a1aaaaaaab%3A0x1234567890abcdef!2sLisbon%2C%20Portugal!5e0!3m2!1sen!2spt!4v1678886400000!5m2!1sen!2spt"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Restaurant Location Map"
                ></iframe>
              </div>

              <div className="flex flex-col justify-center space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-medium">Endereço</h3>
                      <p className="text-muted-foreground">Rua Fictícia, 123</p>
                      <p className="text-muted-foreground">Lisboa, 1000-001</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-medium">Telefone</h3>
                      <p className="text-muted-foreground">{whatsappNumber}</p>
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
                  <h3 className="font-medium mb-2">Como Chegar</h3>
                  <p className="text-muted-foreground mb-4">
                    Próximo à estação de metrô XYZ. Estacionamento disponível na rua.
                  </p>
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

      <footer className="border-t py-8 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Ryōri</h3>
              <p className="text-muted-foreground text-sm">
                Uma experiência gastronômica única com os melhores sabores da culinária contemporânea.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Contato</h3>
              <div className="space-y-1 text-muted-foreground text-sm">
                <p>Rua Fictícia, 123 - Lisboa</p>
                <p>1000-001</p>
                <p>{whatsappNumber}</p>
                <p>contato@ryori.pt</p>
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
