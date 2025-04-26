"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Pencil, Save, Clock, Trash2 } from "lucide-react"

// Tipos
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

export default function AvailabilityEditor() {
  const [daysAvailability, setDaysAvailability] = useState<DayAvailabilityType[]>([])
  const [editingDay, setEditingDay] = useState<DayAvailabilityType | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Carregar dados do localStorage ao iniciar
  useEffect(() => {
    const savedAvailability = localStorage.getItem("restaurantAvailability")
    if (savedAvailability) {
      setDaysAvailability(JSON.parse(savedAvailability))
    } else {
      // Carregar dados iniciais de disponibilidade
      setDaysAvailability(getInitialAvailability())
      localStorage.setItem("restaurantAvailability", JSON.stringify(getInitialAvailability()))
    }
  }, [])

  // Salvar no localStorage quando os dados mudarem
  useEffect(() => {
    if (daysAvailability.length > 0) {
      localStorage.setItem("restaurantAvailability", JSON.stringify(daysAvailability))
    }
  }, [daysAvailability])

  const handleEditDay = (day: DayAvailabilityType) => {
    setEditingDay({ ...day, timeSlots: [...day.timeSlots] })
    setIsDialogOpen(true)
  }

  const handleToggleDayEnabled = (id: string, enabled: boolean) => {
    setDaysAvailability(daysAvailability.map((day) => (day.id === id ? { ...day, enabled } : day)))
    showSuccessMessage(`${enabled ? "Ativado" : "Desativado"} com sucesso!`)
  }

  const handleSaveDay = () => {
    if (!editingDay) return

    // Validar horários
    if (!editingDay.openTime || !editingDay.closeTime) {
      alert("Por favor, defina os horários de abertura e fechamento.")
      return
    }

    setDaysAvailability(daysAvailability.map((day) => (day.id === editingDay.id ? editingDay : day)))

    setIsDialogOpen(false)
    setEditingDay(null)
    showSuccessMessage("Horários atualizados com sucesso!")
  }

  const handleAddTimeSlot = () => {
    if (!editingDay) return

    const newTimeSlot: TimeSlotType = {
      id: Date.now().toString(),
      time: "",
      available: true,
    }

    setEditingDay({
      ...editingDay,
      timeSlots: [...editingDay.timeSlots, newTimeSlot],
    })
  }

  const handleUpdateTimeSlot = (id: string, time: string, available: boolean) => {
    if (!editingDay) return

    setEditingDay({
      ...editingDay,
      timeSlots: editingDay.timeSlots.map((slot) => (slot.id === id ? { ...slot, time, available } : slot)),
    })
  }

  const handleRemoveTimeSlot = (id: string) => {
    if (!editingDay) return

    setEditingDay({
      ...editingDay,
      timeSlots: editingDay.timeSlots.filter((slot) => slot.id !== id),
    })
  }

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => {
      setSuccessMessage("")
    }, 3000)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciamento de Disponibilidade</h2>
      </div>

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-600">{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dias e Horários de Funcionamento</CardTitle>
          <CardDescription>Configure os dias e horários em que o restaurante aceita reservas</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia da Semana</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Horário</TableHead>
                  <TableHead className="hidden lg:table-cell">Horários Disponíveis</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daysAvailability.map((day) => (
                  <TableRow key={day.id}>
                    <TableCell className="font-medium">
                      {day.name}
                      <div className="block md:hidden text-xs text-muted-foreground mt-1">
                        {day.enabled ? `${day.openTime} - ${day.closeTime}` : "Fechado"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`day-${day.id}`}
                          checked={day.enabled}
                          onCheckedChange={(checked) => handleToggleDayEnabled(day.id, checked)}
                        />
                        <Label htmlFor={`day-${day.id}`} className="text-sm">
                          {day.enabled ? "Aberto" : "Fechado"}
                        </Label>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {day.enabled ? (
                        <span>
                          {day.openTime} - {day.closeTime}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Fechado</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {day.enabled ? (
                        <div className="flex flex-wrap gap-1">
                          {day.timeSlots
                            .filter((slot) => slot.available)
                            .slice(0, 3)
                            .map((slot) => (
                              <span
                                key={slot.id}
                                className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                              >
                                {slot.time}
                              </span>
                            ))}
                          {day.timeSlots.filter((slot) => slot.available).length > 3 && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium">
                              +{day.timeSlots.filter((slot) => slot.available).length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Indisponível</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditDay(day)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Disponibilidade - {editingDay?.name}</DialogTitle>
            <DialogDescription>
              Configure os horários de funcionamento e os horários disponíveis para reservas.
            </DialogDescription>
          </DialogHeader>
          {editingDay && (
            <div className="space-y-6 py-4">
              <div className="flex items-center space-x-4">
                <Switch
                  id="day-enabled"
                  checked={editingDay.enabled}
                  onCheckedChange={(checked) => setEditingDay({ ...editingDay, enabled: checked })}
                />
                <Label htmlFor="day-enabled">{editingDay.enabled ? "Aberto" : "Fechado"}</Label>
              </div>

              {editingDay.enabled && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="open-time">Horário de Abertura</Label>
                      <Input
                        id="open-time"
                        type="time"
                        value={editingDay.openTime}
                        onChange={(e) => setEditingDay({ ...editingDay, openTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="close-time">Horário de Fechamento</Label>
                      <Input
                        id="close-time"
                        type="time"
                        value={editingDay.closeTime}
                        onChange={(e) => setEditingDay({ ...editingDay, closeTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label>Horários Disponíveis para Reservas</Label>
                      <Button variant="outline" size="sm" onClick={handleAddTimeSlot}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Horário
                      </Button>
                    </div>

                    {editingDay.timeSlots.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Nenhum horário disponível. Adicione horários para reservas.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {editingDay.timeSlots.map((slot) => (
                          <div key={slot.id} className="flex items-center space-x-3 border p-3 rounded-md">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="time"
                              value={slot.time}
                              onChange={(e) => handleUpdateTimeSlot(slot.id, e.target.value, slot.available)}
                              className="flex-1"
                            />
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`slot-${slot.id}`}
                                checked={slot.available}
                                onCheckedChange={(checked) => handleUpdateTimeSlot(slot.id, slot.time, checked)}
                              />
                              <Label htmlFor={`slot-${slot.id}`} className="text-sm">
                                {slot.available ? "Disponível" : "Indisponível"}
                              </Label>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveTimeSlot(slot.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDay}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Dados iniciais de disponibilidade
function getInitialAvailability(): DayAvailabilityType[] {
  return [
    {
      id: "1",
      name: "Segunda-feira",
      enabled: true,
      openTime: "12:00",
      closeTime: "23:00",
      timeSlots: [
        { id: "1-1", time: "12:00", available: true },
        { id: "1-2", time: "13:00", available: true },
        { id: "1-3", time: "19:00", available: true },
        { id: "1-4", time: "20:00", available: true },
        { id: "1-5", time: "21:00", available: true },
      ],
    },
    {
      id: "2",
      name: "Terça-feira",
      enabled: true,
      openTime: "12:00",
      closeTime: "23:00",
      timeSlots: [
        { id: "2-1", time: "12:00", available: true },
        { id: "2-2", time: "13:00", available: true },
        { id: "2-3", time: "19:00", available: true },
        { id: "2-4", time: "20:00", available: true },
        { id: "2-5", time: "21:00", available: true },
      ],
    },
    {
      id: "3",
      name: "Quarta-feira",
      enabled: true,
      openTime: "12:00",
      closeTime: "23:00",
      timeSlots: [
        { id: "3-1", time: "12:00", available: true },
        { id: "3-2", time: "13:00", available: true },
        { id: "3-3", time: "19:00", available: true },
        { id: "3-4", time: "20:00", available: true },
        { id: "3-5", time: "21:00", available: true },
      ],
    },
    {
      id: "4",
      name: "Quinta-feira",
      enabled: true,
      openTime: "12:00",
      closeTime: "23:00",
      timeSlots: [
        { id: "4-1", time: "12:00", available: true },
        { id: "4-2", time: "13:00", available: true },
        { id: "4-3", time: "19:00", available: true },
        { id: "4-4", time: "20:00", available: true },
        { id: "4-5", time: "21:00", available: true },
      ],
    },
    {
      id: "5",
      name: "Sexta-feira",
      enabled: true,
      openTime: "12:00",
      closeTime: "00:00",
      timeSlots: [
        { id: "5-1", time: "12:00", available: true },
        { id: "5-2", time: "13:00", available: true },
        { id: "5-3", time: "19:00", available: true },
        { id: "5-4", time: "20:00", available: true },
        { id: "5-5", time: "21:00", available: true },
        { id: "5-6", time: "22:00", available: true },
      ],
    },
    {
      id: "6",
      name: "Sábado",
      enabled: true,
      openTime: "12:00",
      closeTime: "00:00",
      timeSlots: [
        { id: "6-1", time: "12:00", available: true },
        { id: "6-2", time: "13:00", available: true },
        { id: "6-3", time: "19:00", available: true },
        { id: "6-4", time: "20:00", available: true },
        { id: "6-5", time: "21:00", available: true },
        { id: "6-6", time: "22:00", available: true },
      ],
    },
    {
      id: "7",
      name: "Domingo",
      enabled: true,
      openTime: "12:00",
      closeTime: "22:00",
      timeSlots: [
        { id: "7-1", time: "12:00", available: true },
        { id: "7-2", time: "13:00", available: true },
        { id: "7-3", time: "19:00", available: true },
        { id: "7-4", time: "20:00", available: true },
        { id: "7-5", time: "21:00", available: true },
      ],
    },
  ]
}
