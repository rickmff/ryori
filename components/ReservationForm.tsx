"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DayAvailabilityType, TimeSlotType } from "@/lib/admin-store" // Assuming types are exported

interface ReservationFormProps {
  availability: DayAvailabilityType[]
  whatsappNumber: string // Pass WhatsApp number as a prop
}

export function ReservationForm({ availability, whatsappNumber }: ReservationFormProps) {


  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedDay, setSelectedDay] = useState<DayAvailabilityType | null>(null)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlotType[]>([])
  const [selectedTime, setSelectedTime] = useState<string>("")

  // State for reservation form fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [guests, setGuests] = useState("")
  const [notes, setNotes] = useState("")

  // Update selected day and time slots when date changes
  useEffect(() => {
    if (date && availability.length > 0) {
      const dayOfWeek = date.getDay()
      // Convert de 0-6 (domingo-sábado) para 6,0-5 (domingo=6, segunda=0, etc.) used by admin store
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const currentDay = availability[dayIndex]
      setSelectedDay(currentDay)

      if (currentDay && currentDay.enabled) {
        setAvailableTimeSlots(currentDay.timeSlots.filter((slot) => slot.available))
      } else {
        setAvailableTimeSlots([])
      }
      setSelectedTime("") // Reset time when date changes
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

    const message = `Olá, gostaria de fazer uma reserva:\\n\\nNome: ${name}\\nEmail: ${email || "Não informado"}\\nTelefone: ${phone || "Não informado"}\\nData: ${formattedDate}\\nHorário: ${selectedTime}\\nPessoas: ${guests}\\nObservações: ${notes || "Nenhuma"}`

    const cleanWhatsappNumber = whatsappNumber.replace(/[\s+]/g, "") // Remove '+' and spaces
    const whatsappUrl = `https://wa.me/${cleanWhatsappNumber}?text=${encodeURIComponent(message)}`

    // Redirect user to WhatsApp
    window.location.href = whatsappUrl
  }

  return (
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
            <Select value={selectedTime} onValueChange={setSelectedTime} disabled={!selectedDay || !selectedDay.enabled}>
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
      </form>
    </div>
  )
}