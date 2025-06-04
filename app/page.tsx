"use client";
import { SetStateAction, useEffect, useState } from "react";
import Image from "next/image"
import { MapPin, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReservationForm } from "@/components/ReservationForm"
import Script from 'next/script'
import Menu from "@/components/Menu"
import { OpeningHours } from "@/components/OpeningHours"
import { smoothScroll } from "@/app/utils/smoothScroll";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import Gallery from "@/components/Gallery";

export default function RestaurantePage() {
  const whatsappNumber = "351968217889"
  const restaurantUrl = "https://ryorirestaurant.com"
  const imageUrl = `${restaurantUrl}/ryori-hero.jpg`

  // State to track the current set of images
  const [imageIndices, setImageIndices] = useState<number[]>([]);
  // State to track the next image that will appear
  const [nextImage, setNextImage] = useState<number | null>(null);
  // Track which image is currently fading
  const [fadingIndex, setFadingIndex] = useState<number | null>(null);

  // Total number of available images (10-31 based on your folder)
  const totalImages = 22;
  const startIndex = 10; // Your images start at index 10

  // Initialize random images on first render
  useEffect(() => {
    const initialIndices: SetStateAction<number[]> = [];
    while (initialIndices.length < 8) {
      const randomNum = Math.floor(Math.random() * totalImages) + startIndex;
      if (!initialIndices.includes(randomNum)) {
        initialIndices.push(randomNum);
      }
    }
    setImageIndices(initialIndices);
  }, []);

  // Function to get a new random image that's not currently displayed
  const getNewRandomImage = () => {
    const currentImages = new Set(imageIndices);
    const availableImages = [];

    for (let i = startIndex; i < startIndex + totalImages; i++) {
      if (!currentImages.has(i)) {
        availableImages.push(i);
      }
    }

    if (availableImages.length === 0) return startIndex; // Fallback

    const randomIndex = Math.floor(Math.random() * availableImages.length);
    return availableImages[randomIndex];
  };

  // Effect to change one image periodically
  useEffect(() => {
    if (imageIndices.length < 8) return; // Wait until we have a full set

    const intervalId = setInterval(() => {
      // Select a random position to change (0-7)
      const positionToChange = Math.floor(Math.random() * 8);
      // Prepare the next image that will appear
      const newImageNum = getNewRandomImage();

      // Set up the transition
      setFadingIndex(positionToChange);
      setNextImage(newImageNum);

      // After fade out completes, update the image array
      setTimeout(() => {
        setImageIndices(prev => {
          const newIndices = [...prev];
          newIndices[positionToChange] = newImageNum;
          return newIndices;
        });

        // Reset states after transition completes
        setTimeout(() => {
          setFadingIndex(null);
          setNextImage(null);
        }, 100);
      }, 500); // Match this with the CSS transition duration

    }, 1000); // Change one image every 3 seconds

    return () => clearInterval(intervalId);
  }, [imageIndices]);

  // Add event listeners for smooth scrolling
  useEffect(() => {
    const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement> | MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href^="#"]');
      if (!target) return;

      const targetId = target.getAttribute('href')?.substring(1);
      if (targetId) {
        e.preventDefault();
        smoothScroll(targetId, 1000); // 2000ms = 2 seconds for scroll duration
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      document.removeEventListener('click', handleAnchorClick);
    };
  }, []);

  // Add state for gallery dialog
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Function to handle gallery navigation
  const navigateGallery = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev + 1) % imageIndices.length);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + imageIndices.length) % imageIndices.length);
    }
  };

  // Function to open gallery with specific image
  const openGallery = (index: number) => {
    setCurrentImageIndex(index);
    setGalleryOpen(true);
  };

  const restaurantSchema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": "Ryōri",
    "alternateName": "Ryōri Restaurante",
    "description": "Restaurante de fusão que combina a tradição portuguesa com a sofisticação da culinária japonesa em Setúbal",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "PC Marquês de Pombal 2A",
      "addressLocality": "Setúbal",
      "postalCode": "2900-562",
      "addressCountry": "PT",
      "addressRegion": "Setúbal"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "38.5244",
      "longitude": "-8.8882"
    },
    "telephone": "+351968217889",
    "servesCuisine": ["Portuguesa", "Japonesa", "Fusão", "Fine Dining"],
    "url": restaurantUrl,
    "image": [
      imageUrl,
      `${restaurantUrl}/ryori-front.webp`
    ],
    "logo": `${restaurantUrl}/logo.png`,
    "priceRange": "€€€",
    "paymentAccepted": "Cash, Credit Card",
    "currenciesAccepted": "EUR",
    "hasMenu": `${restaurantUrl}#menu`,
    "acceptsReservations": true,
    "sameAs": [
      "https://www.instagram.com/ryori_restaurante/",
      "https://www.facebook.com/RyoriSetubal/",
      "https://maps.app.goo.gl/iHR9UKvxR8pQEbvR7"
    ],
    "potentialAction": {
      "@type": "ReserveAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `https://wa.me/${whatsappNumber}`
      }
    },
    "amenityFeature": [
      {
        "@type": "LocationFeatureSpecification",
        "name": "Accessible",
        "value": true
      }
    ]
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://ryorirestaurant.com/#restaurant",
    "name": "Ryōri Restaurante",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "PC Marquês de Pombal 2A",
      "addressLocality": "Setúbal",
      "postalCode": "2900-562",
      "addressCountry": "PT"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "38.5244",
      "longitude": "-8.8882"
    },
    "telephone": "+351968217889",
    "url": restaurantUrl,
    "image": imageUrl,
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "19:00",
        "closes": "00:00"
      }
    ],
    "areaServed": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": "38.5244",
        "longitude": "-8.8882"
      },
      "geoRadius": "50000"
    }
  };

  return (
    <>
      <Script
        id="restaurant-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema) }}
      />

      <Script
        id="local-business-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      {/* Gallery Dialog */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-screen-lg w-full p-0 h-[90vh] max-h-[90vh] bg-black/95 border-none">
          <DialogHeader>
            <DialogTitle className="sr-only">Dialog Title</DialogTitle>
          </DialogHeader>
          <div className="relative h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setGalleryOpen(false)}
              className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>

            {/* Navigation buttons */}
            <button
              onClick={() => navigateGallery('prev')}
              className="absolute left-4 z-40 text-white hover:text-gray-300 transition-colors"
            >
              <ChevronLeft size={36} />
            </button>

            <button
              onClick={() => navigateGallery('next')}
              className="absolute right-4 z-40 text-white hover:text-gray-300 transition-colors"
            >
              <ChevronRight size={36} />
            </button>

            {/* Current image */}
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="relative w-full h-full max-h-[80vh] flex items-center justify-center">
                <Image
                  src={`/gallery/IMG-20250514-WA00${imageIndices[currentImageIndex]}.jpg`}
                  alt={`Imagem da galeria ${currentImageIndex + 1}`}
                  fill
                  className="object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-image.jpg";
                  }}
                />
              </div>
            </div>

            {/* Image counter */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-white">
              {currentImageIndex + 1} / {imageIndices.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col min-h-screen">

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
                    <a href="#reservations" className="!bg-black text-white transition-all duration-300 border-black">Reservar Mesa</a>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 text-white border-white hover:bg-white/20"
                    asChild
                  >
                    <a href="#menu" className="hover:bg-black/50 hover:text-white transition-all duration-300 hover:border-black">Ver Menu</a>
                  </Button>
                </div>
                {/*                 <div className="flex flex-col sm:flex-row gap-4">
                  <Image src="/ryori-logo.png" alt="Restaurante Ryōri" width={100} height={100} />
                </div> */}
              </div>
            </div>
          </section>

          <section id="reservations" className="py-16">
            <div className="container sm:max-w-2xl max-w-full">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-wide">Faça sua Reserva</h2>
                <p className="text-muted-foreground line-clamp-2">
                  Reserve uma mesa e deixe o resto conosco.
                </p>
              </div>
              <ReservationForm whatsappNumber={whatsappNumber} />
            </div>
          </section>

          <section id="gallery" className="py-16">
            <div className="container">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-wide">Nossa Galeria</h2>
                <p className="text-muted-foreground">
                  Conheça um pouco da experiência que preparamos para você.
                </p>
              </div>
              <Gallery />
            </div>
          </section>

          <section id="menu" className="py-16 bg-black/50">
            <div className="container">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-wide">Conheça o nosso Menu</h2>
                <p className="text-muted-foreground line-clamp-2">
                  Venha viajar connosco pelos sabores da cozinha tradicional Portuguesa e Japonesa reservando uma mesa conosco.
                </p>
                <Menu />
              </div>
            </div>
          </section>

          <section id="location" className="py-16 bg-background">
            <div className="container">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-wide">Localização</h2>
                <p className="text-muted-foreground">
                  Estamos localizados em um ponto privilegiado, com fácil acesso.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div className="h-full rounded-lg overflow-hidden relative border">
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

                    <OpeningHours />

                    <Button variant="outline" className="w-full sm:w-auto sm:ml-8" asChild>
                      <a href="https://maps.app.goo.gl/iHR9UKvxR8pQEbvR7" target="_blank" rel="noopener noreferrer">
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
                    href="https://www.instagram.com/ryori_restaurante/"
                    aria-label="Instagram"
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-foreground"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
                  </a>
                  <a
                    href="https://www.facebook.com/RyoriSetubal/"
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
    </>
  )
}
