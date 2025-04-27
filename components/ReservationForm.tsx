"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DayAvailabilityType, TimeSlotType } from "@/lib/admin-store"

interface ReservationFormProps {
  availability: DayAvailabilityType[]
  whatsappNumber: string
}

export function ReservationForm({ availability, whatsappNumber }: ReservationFormProps) {


  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedDay, setSelectedDay] = useState<DayAvailabilityType | null>(null)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlotType[]>([])
  const [selectedTime, setSelectedTime] = useState<string>("")

  // State for reservation form fields
  const [name, setName] = useState("")
  const [guests, setGuests] = useState("")
  const [notes, setNotes] = useState("")

  // Update selected day and time slots when date changes
  useEffect(() => {
    if (date && availability.length > 0) {
      const dayOfWeek = date.getDay()
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const currentDay = availability[dayIndex]
      setSelectedDay(currentDay)

      if (currentDay && currentDay.enabled) {
        setAvailableTimeSlots(currentDay.timeSlots.filter((slot) => slot.available))
      } else {
        setAvailableTimeSlots([])
      }
      setSelectedTime("")
    }
  }, [date, availability])

  const handleReservation = () => {
    if (!date || !selectedTime || !guests || !name) {
      alert("Por favor, preencha nome, data, horário e número de pessoas.")
      return
    }

    const formattedDate = date.toLocaleDateString("pt-PT")
    const message = `Olá, gostaria de fazer uma reserva:\\n\\nNome: ${name}\\nData: ${formattedDate}\\nHorário: ${selectedTime}\\nPessoas: ${guests}\\nObservações: ${notes || "Nenhuma"}`

    const cleanWhatsappNumber = whatsappNumber.replace(/[\s+]/g, "")
    const whatsappUrl = `https://wa.me/${cleanWhatsappNumber}?text=${encodeURIComponent(message)}`

    window.location.href = whatsappUrl
  }

  return (
    <div className="bg-card p-6 rounded-lg border">
      <form className="space-y-4">
        <div className="space-y-2">
          <Calendar mode="single" selected={date} onSelect={setDate} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium">
            Horário
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {!selectedDay || !selectedDay.enabled ? (
              <p className="text-sm text-muted-foreground col-span-full">Dia indisponível</p>
            ) : availableTimeSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">Sem horários disponíveis</p>
            ) : (
              availableTimeSlots.map((slot) => (
                <Button
                  key={slot.id}
                  variant={selectedTime === slot.time ? "default" : "outline"}
                  onClick={() => setSelectedTime(slot.time)}
                  type="button"
                  className="w-full justify-center"
                >
                  {slot.time}
                </Button>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2 w-full">
            <label htmlFor="name" className="text-sm font-medium">
              Nome
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
              Pessoas
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
      </form >
    </div >
  )
}