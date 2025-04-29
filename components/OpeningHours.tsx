"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"
import { firestore } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

type TimeRange = {
  id: string
  open: string
  close: string
}

type DayAvailabilityType = {
  id: string
  name: string
  shortName: string
  enabled: boolean
  timeRanges: TimeRange[]
}

export function OpeningHours() {
  const [availability, setAvailability] = useState<DayAvailabilityType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!firestore) {
        setError("Firestore não está disponível")
        setIsLoading(false)
        return
      }

      try {
        const availabilityDocRef = doc(firestore, "availability", "restaurant")
        const docSnap = await getDoc(availabilityDocRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          if (data && Array.isArray(data.days)) {
            setAvailability(data.days)
          } else {
            setError("Dados de disponibilidade inválidos")
          }
        } else {
          setError("Configuração de disponibilidade não encontrada")
        }
      } catch (e) {
        console.error("Erro ao buscar disponibilidade:", e)
        setError("Não foi possível carregar os horários")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAvailability()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
        <div>
          <h3 className="font-medium">Horário</h3>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
        <div>
          <h3 className="font-medium">Horário</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <Clock className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
      <div>
        <h3 className="font-medium">Horário</h3>
        {availability.length > 0 ? (
          availability.map((day) => (
            <div key={day.id} className="flex gap-2 text-muted-foreground mt-1">
              <span className="w-8">{day.shortName}:</span>
              <span>
                {day.enabled
                  ? day.timeRanges && day.timeRanges.length > 0
                    ? day.timeRanges.map((range) => `${range.open}-${range.close}`).join(', ')
                    : "Fechado"
                  : "Fechado"}
              </span>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">Horários indisponíveis.</p>
        )}
      </div>
    </div>
  )
}