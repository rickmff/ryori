"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarDays, Clock, User, CheckCircle, ChevronRight } from "lucide-react"
import React from "react"

import { firestore } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import type { DayAvailabilityType } from "./admin/AvailabilityEditor"
import { ptBR } from "date-fns/locale"

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

  const [step, setStep] = useState(0)

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
    const message = `Olá, gostava de fazer uma reserva:\n\nNome: ${name}\nData: ${formattedDate}\nHorário: ${selectedTime}\nPessoas: ${guests}\nObservações: ${notes || "Nenhuma"}`

    const cleanWhatsappNumber = whatsappNumber.replace(/[^\d]/g, "")
    const whatsappUrl = `https://wa.me/${cleanWhatsappNumber}?text=${encodeURIComponent(message)}`

    window.location.href = whatsappUrl
  }

  // Stepper configuration
  const steps = [
    { icon: CalendarDays },
    { icon: Clock },
    { icon: User },
    { icon: CheckCircle },
  ]

  // Step validation
  const canProceed = () => {
    if (step === 0) return !!date
    if (step === 1) return !!selectedTime
    if (step === 2) return !!name && !!guests
    return true
  }

  // Handlers for auto-advance
  const handleDateSelect = (d: Date | undefined) => {
    setDate(d)
    if (d) setStep(1)
  }
  const handleTimeSelect = (slot: string) => {
    setSelectedTime(slot)
    if (slot) setStep(2)
  }
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    // If guests already selected, keep them enabled
  }
  const handleGuestsSelect = (value: string) => {
    setGuests(value);
    if (name) setStep(3);
  }

  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-lg border space-y-4">
        <div className="flex mb-12 items-center justify-between">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-12 rounded-full mx-8" />)}
        </div>
        <div className="px-6">
          <Skeleton className="h-10 w-full mb-8" />
          <div className="grid grid-cols-7 gap-4">
            {[...Array(28)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </div>
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
      {/* Stepper */}
      <div className="flex items-center justify-between mb-12">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isActive = idx === step;
          const isCompleted = idx < step;
          // Step is clickable if it's before or equal to current, or if all required fields for that step are filled
          let canGo = false;
          if (idx < step) canGo = true;
          if (idx === step) canGo = true;
          if (idx === 1 && date) canGo = true;
          if (idx === 2 && date && selectedTime) canGo = true;
          if (idx === 3 && date && selectedTime && name && guests) canGo = true;
          return (
            <React.Fragment key={idx}>
              <button
                type="button"
                className={`flex-1 flex flex-col items-center group focus:outline-none disabled:opacity-60`}
                onClick={() => canGo && setStep(idx)}
                disabled={!canGo}
                tabIndex={canGo ? 0 : -1}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors duration-150 ${isActive ? 'border-primary bg-primary text-primary-foreground' : isCompleted ? 'border-green-500 bg-green-100 text-green-600' : 'border-muted bg-muted text-muted-foreground'} group-focus:ring-2 group-focus:ring-primary`}>
                  <Icon className="w-6 h-6" />
                </div>
              </button>
              {idx < steps.length - 1 && (
                <ChevronRight className="w-5 h-5 text-muted-foreground/30 mx-1" />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <form className="space-y-4">
        {/* Step 1: Date */}
        {step === 0 && (
          <div className="space-y-2">
            <Calendar
              mode="single"
              locale={ptBR}
              selected={date}
              onSelect={handleDateSelect}
              onDayClick={(d: Date) => {
                // Check if the day is enabled (not disabled)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dayOfWeek = d.getDay();
                const dayId = dayOfWeek === 0 ? "7" : dayOfWeek.toString();
                const dayConfig = daysAvailability.find(day => day.id === dayId);
                const isDisabled = d < today || isLoading || daysAvailability.length === 0 || (dayConfig && !dayConfig.enabled);
                if (!isDisabled) {
                  setDate(d);
                  setStep(1);
                }
              }}
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
        )}
        {/* Step 2: Time */}
        {step === 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Horário*</label>
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
                    onClick={() => handleTimeSelect(slot)}
                    type="button"
                    className="w-full justify-center"
                  >
                    {slot}
                  </Button>
                ))
              )}
            </div>
          </div>
        )}
        {/* Step 3: Guests & Name */}
        {step === 2 && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2 w-full">
              <label htmlFor="name" className="text-sm font-medium">Nome*</label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={name}
                onChange={handleNameChange}
                required
              />
            </div>
            <div className="space-y-2 w-full">
              <label htmlFor="guests" className="text-sm font-medium">Pessoas*</label>
              <Select value={guests} onValueChange={handleGuestsSelect} required disabled={!name}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(8)].map((_, i) => (
                    <SelectItem
                      key={i + 1}
                      value={(i + 1).toString()}
                    >
                      {i + 1} pessoa{i > 0 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        {/* Step 4: Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-black/50 rounded-lg p-4 border flex flex-col gap-4 text-sm">
              <div className="flex items-center gap-2"><User className="w-4 h-4" /><b>Nome:</b> <span>{name}</span></div>
              <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /><b>Data:</b> <span>{date ? date.toLocaleDateString("pt-PT") : "-"}</span></div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><b>Horário:</b> <span>{selectedTime}</span></div>
              <div className="flex items-center gap-2"><User className="w-4 h-4" /><b>Pessoas:</b> <span>{guests}</span></div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /><b>Observações:</b> <span>{notes || "Nenhuma"}</span></div>
            </div>
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">Observações especiais (opcional)</label>
              <Input
                id="notes"
                placeholder="Alergias, preferências, ocasiões especiais, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}
        {/* Navigation Buttons */}
        {/*         <div className="flex gap-2 mt-4 opacity-50">
          {step > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              <ArrowLeft />
              Voltar
            </Button>
          )}
        </div>
        */}
        {step === steps.length - 1 && (
          <Button type="button" className="w-full" onClick={handleReservation} disabled={!canProceed()}>
            Confirmar Reserva via WhatsApp
          </Button>
        )}
      </form >
    </div >
  )
}