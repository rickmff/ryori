"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

import { firestore } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import type { DayAvailabilityType } from "./admin/AvailabilityEditor"

function timeToMinutes(time: string): number {
  if (!time || typeof time !== 'string' || !time.includes(":")) {
    return 0;
  }
  const parts = time.split(":");
  if (parts.length !== 2) {
    return 0;
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 0;
  }
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  if (typeof totalMinutes !== 'number' || isNaN(totalMinutes) || totalMinutes < 0 || totalMinutes > 1439) {
    totalMinutes = 0;
  }
  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function generateTimeSlots(day: DayAvailabilityType): string[] {
  if (!day.enabled || day.timeRanges.length === 0) return []

  const allSlots: string[] = []

  day.timeRanges.forEach((range) => {
    if (!range.open || !range.close) return

    const openMinutes = timeToMinutes(range.open);
    const closeMinutes = timeToMinutes(range.close);

    let currentTimeInMinutes = openMinutes
    const adjustedCloseTime = closeMinutes <= openMinutes ? closeMinutes + 24 * 60 : closeMinutes
    const lastReservationTime = adjustedCloseTime - day.lastReservationBeforeClose

    while (currentTimeInMinutes <= lastReservationTime) {
      allSlots.push(minutesToTime(currentTimeInMinutes));
      currentTimeInMinutes += day.reservationInterval
    }
  })

  const uniqueSortedSlots = [...new Set(allSlots)].sort()
  return uniqueSortedSlots
}

interface ReservationFormProps {
  whatsappNumber: string
}

export function ReservationForm({ whatsappNumber }: ReservationFormProps) {
  const [daysAvailability, setDaysAvailability] = useState<DayAvailabilityType[]>([])
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedDay, setSelectedDay] = useState<DayAvailabilityType | null>(null)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([])
  const [selectedTime, setSelectedTime] = useState<string>("")

  const [name, setName] = useState("")
  const [guests, setGuests] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    const loadAvailability = async () => {
      const availabilityDocRef = firestore ? doc(firestore, "availability", "restaurant") : null;
      if (!firestore || !availabilityDocRef) {
        setError("Erro de configuração do Firebase.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const docSnap = await getDoc(availabilityDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.days)) {
            setDaysAvailability(data.days as DayAvailabilityType[]);
          } else {
            setError("Dados de disponibilidade inválidos.");
            setDaysAvailability([]);
          }
        } else {
          setError("Configuração de disponibilidade não encontrada.");
          setDaysAvailability([]);
        }
      } catch (e) {
        console.error("Erro ao buscar disponibilidade:", e);
        setError("Não foi possível carregar os horários.");
        setDaysAvailability([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailability();
  }, [])

  useEffect(() => {
    if (!isLoading && daysAvailability.length > 0 && date === undefined) {
      let potentialDate = new Date();
      potentialDate.setHours(0, 0, 0, 0);

      for (let i = 0; i < 90; i++) {
        const dayOfWeek = potentialDate.getDay();
        const dayId = dayOfWeek === 0 ? "7" : dayOfWeek.toString();
        const dayConfig = daysAvailability.find(day => day.id === dayId);

        const isEnabled = dayConfig ? dayConfig.enabled : false;

        if (isEnabled) {
          setDate(potentialDate);
          break;
        }

        potentialDate.setDate(potentialDate.getDate() + 1);
      }

      if (date === undefined) {
        console.warn("No available dates found within the next 90 days.");
      }
    }
  }, [isLoading, daysAvailability, date]);

  useEffect(() => {
    if (date && daysAvailability.length > 0) {
      const dayOfWeek = date.getDay()
      const dayId = dayOfWeek === 0 ? "7" : dayOfWeek.toString();

      const currentDayData = daysAvailability.find((day) => day.id === dayId);
      setSelectedDay(currentDayData || null);

      if (currentDayData && currentDayData.enabled) {
        setAvailableTimeSlots(generateTimeSlots(currentDayData));
      } else {
        setAvailableTimeSlots([]);
      }
      setSelectedTime("");
    }
  }, [date, daysAvailability])

  const handleReservation = () => {
    if (!date || !selectedTime || !guests || !name) {
      alert("Por favor, preencha nome, data, horário e número de pessoas.")
      return
    }

    const formattedDate = date.toLocaleDateString("pt-PT")
    const message = `Olá, gostaria de fazer uma reserva:\n\nNome: ${name}\nData: ${formattedDate}\nHorário: ${selectedTime}\nPessoas: ${guests}\nObservações: ${notes || "Nenhuma"}`

    const cleanWhatsappNumber = whatsappNumber.replace(/[^\d]/g, "")
    const whatsappUrl = `https://wa.me/${cleanWhatsappNumber}?text=${encodeURIComponent(message)}`

    window.location.href = whatsappUrl
  }

  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-lg border space-y-4">
        <Skeleton className="h-[280px] w-full rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card p-6 rounded-lg border">
        <Alert variant="destructive">
          <AlertDescription>Por favor, tente novamente mais tarde.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="bg-card p-6 rounded-lg border">
      <form className="space-y-4">
        <div className="space-y-2">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(d: Date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (d < today) return true;

              if (isLoading || daysAvailability.length === 0) {
                return true;
              }

              const dayOfWeek = d.getDay();
              const dayId = dayOfWeek === 0 ? "7" : dayOfWeek.toString();
              const dayConfig = daysAvailability.find(day => day.id === dayId);

              if (dayConfig && !dayConfig.enabled) {
                return true;
              }

              return false;
            }}
          />
        </div>

        <div className="p-2 space-y-4 ">
          <div className="space-y-2 sm:col-span-2 ">
            <label className="text-sm font-medium">
              Horário*
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {!selectedDay || !selectedDay.enabled ? (
                <p className="text-sm text-muted-foreground col-span-full">Dia indisponível</p>
              ) : availableTimeSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">Sem horários disponíveis</p>
              ) : (
                availableTimeSlots.map((slot) => (
                  <Button
                    key={slot}
                    variant={selectedTime === slot ? "default" : "outline"}
                    onClick={() => setSelectedTime(slot)}
                    type="button"
                    className="w-full justify-center"
                  >
                    {slot}
                  </Button>
                ))
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2 w-full">
              <label htmlFor="name" className="text-sm font-medium">
                Nome*
              </label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 w-full">
              <label htmlFor="guests" className="text-sm font-medium">
                Pessoas*
              </label>
              <Select value={guests} onValueChange={setGuests} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(8)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {i + 1} pessoa{i > 0 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Observações especiais (opcional)
            </label>
            <Input
              id="notes"
              placeholder="Alergias, preferências, ocasiões especiais, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button type="button" className="w-full" onClick={handleReservation} disabled={!selectedTime || !name || !guests}>
            Confirmar Reserva via WhatsApp
          </Button>
        </div >
      </form >
    </div >
  )
}