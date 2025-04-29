"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Clock, Save, Copy, Info, PlusCircle, XCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

// Import Firestore functions and the initialized instance
import { firestore } from "@/lib/firebase" // Assuming your firebase setup is in lib/firebase.ts
import { doc, getDoc, setDoc } from "firebase/firestore"

// Tipos simplificados
export type TimeRange = {
  id: string // Unique ID for React key prop
  open: string
  close: string
}

export type DayAvailabilityType = {
  id: string
  name: string
  shortName: string
  enabled: boolean
  timeRanges: TimeRange[] // Changed from openTime/closeTime
  reservationInterval: number // em minutos
  lastReservationBeforeClose: number // em minutos
}

// Helper function to convert "HH:MM" to minutes since midnight (More Robust)
function timeToMinutes(time: string): number {
  if (!time || typeof time !== 'string' || !time.includes(":")) {
    // console.warn(`Invalid time input for timeToMinutes: ${time}. Defaulting to 0.`);
    return 0; // Default for invalid format or type
  }
  const parts = time.split(":");
  if (parts.length !== 2) {
    // console.warn(`Invalid time format (parts) for timeToMinutes: ${time}. Defaulting to 0.`);
    return 0;
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  // Validate ranges strictly
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.warn(`Invalid time values parsed from ${time} (H:${hours}, M:${minutes}). Defaulting to 0.`);
    return 0;
  }
  return hours * 60 + minutes;
}

// Helper function to convert minutes since midnight to "HH:MM" (More Robust)
function minutesToTime(totalMinutes: number): string {
  // Ensure totalMinutes is a valid number within the expected range
  if (typeof totalMinutes !== 'number' || isNaN(totalMinutes) || totalMinutes < 0 || totalMinutes > 1439) {
    console.warn(`Invalid totalMinutes input for minutesToTime: ${totalMinutes}. Defaulting to 00:00.`);
    totalMinutes = 0; // Default to 00:00 for safety
  }
  // Round minutes just in case slider provides non-integer values somehow
  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export default function AvailabilityEditor() {
  // Define ALL_WEEK_DAYS INSIDE the component
  const ALL_WEEK_DAYS = [
    { id: "1", name: "Segunda-feira", shortName: "Seg" },
    { id: "2", name: "Terça-feira", shortName: "Ter" },
    { id: "3", name: "Quarta-feira", shortName: "Qua" },
    { id: "4", name: "Quinta-feira", shortName: "Qui" },
    { id: "5", name: "Sexta-feira", shortName: "Sex" },
    { id: "6", name: "Sábado", shortName: "Sáb" },
    { id: "7", name: "Domingo", shortName: "Dom" },
  ];

  const [daysAvailability, setDaysAvailability] = useState<DayAvailabilityType[]>([])
  // State to store the initially loaded data for comparison
  const [initialDaysAvailability, setInitialDaysAvailability] = useState<DayAvailabilityType[]>([])
  // State to track if there are unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  const [activeDay, setActiveDay] = useState<string>("1") // ID do dia ativo
  const [successMessage, setSuccessMessage] = useState("")
  const [previewTimeSlots, setPreviewTimeSlots] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [error, setError] = useState<string | null>(null); // Add error state

  // Define Firestore document reference
  const availabilityDocRef = firestore ? doc(firestore, "availability", "restaurant") : null;

  // Carregar dados do Firestore ao iniciar
  useEffect(() => {
    const loadAvailability = async () => {
      if (!firestore || !availabilityDocRef) {
        console.warn("Firestore not initialized yet.");
        // Optionally set initial data here if Firestore might take time
        // setDaysAvailability(getInitialAvailability());
        setIsLoading(false); // Stop loading even if firestore isn't ready
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const docSnap = await getDoc(availabilityDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // Validate data structure - basic check
          if (data && Array.isArray(data.days)) { // Simpler check: just need the days array
            // Ensure each timeRange has a unique ID
            const validatedData = data.days.map((day: DayAvailabilityType) => ({
              ...day,
              timeRanges: day.timeRanges.map((range, index) => ({
                ...range,
                id: range.id || `range-${Date.now()}-${index}`, // Add ID if missing
              })),
            }))
            setDaysAvailability(validatedData);
            // Store the loaded data as the initial state
            setInitialDaysAvailability(JSON.parse(JSON.stringify(validatedData))); // Deep copy
            setIsDirty(false); // Reset dirty state on successful load
          } else {
            console.warn("Dados de disponibilidade do Firestore estão em formato inesperado ou vazios.");
            setDaysAvailability([]);
            setInitialDaysAvailability([]); // Reset initial state
            setIsDirty(false);
          }
        } else {
          console.log("Nenhum documento de disponibilidade encontrado no Firestore. A configuração precisa ser salva.");
          // Don't load initial data, just start empty
          setDaysAvailability([]);
          setInitialDaysAvailability([]); // Reset initial state
          // Mark as dirty if starting empty, so the first save is possible
          setIsDirty(true); // Set dirty true if creating from scratch
          // Optionally set a message indicating setup is needed?
          // Save the initial data to Firestore for the first time
          await setDoc(availabilityDocRef, { days: [] });
          showSuccessMessage("Configuração inicial de disponibilidade salva.");
        }
      } catch (e) {
        console.error("Erro ao carregar dados de disponibilidade do Firestore:", e);
        setError("Falha ao carregar configurações. Tente recarregar.");
        setDaysAvailability([]); // Set to empty array on error
        setInitialDaysAvailability([]); // Reset initial state
        setIsDirty(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailability();
    // Dependency array includes firestore to re-run if it becomes available later
    // Note: availabilityDocRef depends on firestore, so only firestore is needed here conceptually
  }, [firestore]); // Re-run when firestore instance becomes available

  // Effect to check if current state differs from initial state
  useEffect(() => {
    // Simple comparison using JSON stringify
    // Avoid comparing if initial state is still empty during setup
    if (initialDaysAvailability.length > 0 || daysAvailability.length > 0) {
      const currentStateString = JSON.stringify(daysAvailability.sort((a, b) => parseInt(a.id) - parseInt(b.id)));
      const initialStateString = JSON.stringify(initialDaysAvailability.sort((a, b) => parseInt(a.id) - parseInt(b.id)));
      setIsDirty(currentStateString !== initialStateString);
    }
    // Add initialDaysAvailability to dependency array
  }, [daysAvailability, initialDaysAvailability]);

  // Atualizar preview de horários quando o dia ativo mudar
  useEffect(() => {
    const currentDay = daysAvailability.find((day) => day.id === activeDay)
    if (currentDay && currentDay.enabled) {
      setPreviewTimeSlots(generateTimeSlots(currentDay))
    } else {
      setPreviewTimeSlots([])
    }
  }, [daysAvailability, activeDay])

  // Obter o dia ativo
  const currentDay = daysAvailability.find((day) => day.id === activeDay) || daysAvailability[0]

  // Gerar horários disponíveis com base nas configurações
  function generateTimeSlots(day: DayAvailabilityType): string[] {
    if (!day.enabled || day.timeRanges.length === 0) return []

    const allSlots: string[] = []

    day.timeRanges.forEach((range) => {
      if (!range.open || !range.close) return // Skip incomplete ranges

      // Converter horários para minutos desde meia-noite
      const [openHour, openMinute] = range.open.split(":").map(Number)
      const [closeHour, closeMinute] = range.close.split(":").map(Number)

      let currentTimeInMinutes = openHour * 60 + openMinute
      const closeTimeInMinutes = closeHour * 60 + closeMinute

      // Ajustar para o caso de fechamento após meia-noite
      const adjustedCloseTime = closeTimeInMinutes <= currentTimeInMinutes ? closeTimeInMinutes + 24 * 60 : closeTimeInMinutes

      // Calcular o horário da última reserva possível PARA ESTE INTERVALO
      const lastReservationTime = adjustedCloseTime - day.lastReservationBeforeClose

      // Gerar horários em intervalos regulares DENTRO DESTE INTERVALO
      while (currentTimeInMinutes <= lastReservationTime) {
        const hour = Math.floor(currentTimeInMinutes / 60) % 24
        const minute = currentTimeInMinutes % 60
        allSlots.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`)
        currentTimeInMinutes += day.reservationInterval
      }
    })

    // Ordenar e remover duplicados (embora duplicados sejam improváveis com esta lógica)
    const uniqueSortedSlots = [...new Set(allSlots)].sort()
    return uniqueSortedSlots
  }

  // Manipuladores de eventos
  const handleToggleDayEnabled = (enabled: boolean) => {
    setDaysAvailability(daysAvailability.map((day) => (day.id === activeDay ? { ...day, enabled } : day)))
  }

  // ATUALIZADO: Adicionar um novo intervalo com horários default
  const handleAddTimeRange = () => {
    setDaysAvailability(
      daysAvailability.map((day) =>
        day.id === activeDay
          ? {
            ...day,
            // Add new range with default times suitable for sliders
            timeRanges: [...day.timeRanges, { id: `range-${Date.now()}`, open: "09:00", close: "17:00" }],
          }
          : day,
      ),
    )
  }

  // NOVO: Remover um intervalo de tempo pelo seu ID
  const handleRemoveTimeRange = (rangeIdToRemove: string) => {
    setDaysAvailability(
      daysAvailability.map((day) =>
        day.id === activeDay
          ? {
            ...day,
            timeRanges: day.timeRanges.filter((range) => range.id !== rangeIdToRemove),
          }
          : day,
      ),
    )
  }

  // ATUALIZADO: Handler do Slider com mais validação e logs
  const handleUpdateTimeRangeSlider = (rangeId: string, values: number[]) => {
    // console.log(`Slider change for range ${rangeId}: Received values [${values?.join(', ')}]`); // Log received values

    // Validate incoming values array
    if (!Array.isArray(values) || values.length !== 2 || typeof values[0] !== 'number' || typeof values[1] !== 'number') {
      console.error(`Invalid values array received from slider for range ${rangeId}:`, values);
      return; // Exit if values are not as expected
    }

    // Ensure values are within bounds (slider props should handle this, but good practice)
    // Use Math.round as slider values might not be perfectly aligned with step sometimes
    let safeOpenMinutes = Math.round(Math.max(0, Math.min(1439, values[0])));
    let safeCloseMinutes = Math.round(Math.max(0, Math.min(1439, values[1])));

    // Ensure open is strictly less than close, respecting the minimum step if possible
    // This helps prevent the handles from crossing or becoming equal if minStepsBetweenThumbs fails
    const minStep = 15; // Assuming step is 15
    if (safeOpenMinutes >= safeCloseMinutes) {
      // If they overlap or cross, force close time to be at least one step after open time
      safeCloseMinutes = Math.min(1439, safeOpenMinutes + minStep);
      // Optionally, adjust open time if close time hits the max boundary
      if (safeCloseMinutes === 1439) {
        safeOpenMinutes = Math.max(0, 1439 - minStep);
      }
      console.warn(`Adjusted slider values for range ${rangeId} due to overlap: Open=${safeOpenMinutes}, Close=${safeCloseMinutes}`);
    }


    const newOpenTime = minutesToTime(safeOpenMinutes);
    const newCloseTime = minutesToTime(safeCloseMinutes);

    // console.log(`Updating range ${rangeId} to Open: ${newOpenTime} (${safeOpenMinutes}m), Close: ${newCloseTime} (${safeCloseMinutes}m)`); // Log converted times

    // Use functional update for setting state based on previous state
    setDaysAvailability((currentAvailability) =>
      currentAvailability.map((day) =>
        day.id === activeDay
          ? {
            ...day,
            timeRanges: day.timeRanges.map((range) =>
              range.id === rangeId
                ? { ...range, open: newOpenTime, close: newCloseTime }
                : range
            ),
          }
          : day
      )
    );
  };

  // Keep the original handleUpdateTimeRange for potential other uses
  const handleUpdateTimeRange = (rangeId: string, field: "open" | "close", value: string) => {
    // Basic validation for direct input if ever used
    const minutes = timeToMinutes(value);
    const validatedTime = minutesToTime(minutes); // Ensure it's a valid HH:MM

    setDaysAvailability(
      daysAvailability.map((day) =>
        day.id === activeDay
          ? {
            ...day,
            timeRanges: day.timeRanges.map((range) =>
              range.id === rangeId ? { ...range, [field]: validatedTime } : range
            ),
          }
          : day
      )
    );
  };

  const handleUpdateReservationInterval = (interval: number) => {
    setDaysAvailability(
      daysAvailability.map((day) => (day.id === activeDay ? { ...day, reservationInterval: interval } : day)),
    )
  }

  const handleUpdateLastReservationTime = (minutes: number) => {
    setDaysAvailability(
      daysAvailability.map((day) => (day.id === activeDay ? { ...day, lastReservationBeforeClose: minutes } : day)),
    )
  }

  const handleCopyToAllDays = () => {
    // Button is now disabled if currentDay is null, but check again for safety
    if (!currentDay) return

    // Get settings from the current day
    const { timeRanges, reservationInterval, lastReservationBeforeClose, enabled: sourceEnabled } = currentDay

    // Use functional update for setDaysAvailability
    setDaysAvailability(currentAvailability => {
      // Map over ALL_WEEK_DAYS to ensure we process every potential day
      // Add explicit return type DayAvailabilityType for the map function
      const updatedAvailability = ALL_WEEK_DAYS.map((dayTemplate: { id: string; name: string; shortName: string }): DayAvailabilityType => {
        // Find existing data for this dayTemplate in the *current* state
        const existingDay = currentAvailability.find(d => d.id === dayTemplate.id);

        // Check if it's the active day (source day)
        if (dayTemplate.id === activeDay) {
          // Return the source day (which must exist if we passed the initial check)
          return currentDay;
        }

        // Settings to copy
        const copiedSettings = {
          timeRanges: timeRanges.map((range) => ({ ...range, id: `range-${Date.now()}-${Math.random()}` })), // New IDs
          reservationInterval,
          lastReservationBeforeClose,
          // Decide whether to copy the enabled status or keep the target's status
          enabled: sourceEnabled, // Set target day enabled status same as source
          // enabled: existingDay?.enabled ?? false // Alternative: keep target day's original enabled status
        };

        if (existingDay) {
          // Day exists, update it with copied settings
          return {
            ...existingDay,
            ...copiedSettings,
          };
        } else {
          // Day doesn't exist, create it with copied settings
          const newDay: DayAvailabilityType = {
            id: dayTemplate.id,
            name: dayTemplate.name,
            shortName: dayTemplate.shortName,
            ...copiedSettings, // Apply copied settings (includes enabled, timeRanges etc.)
          };
          return newDay;
        }
      });
      // Sort by ID to keep days in order, adding explicit types
      return updatedAvailability.sort((a: DayAvailabilityType, b: DayAvailabilityType) => parseInt(a.id) - parseInt(b.id));
    });

    showSuccessMessage("Configurações copiadas para todos os dias! Salve as alterações."); // Remind to save
  }

  // Function to revert changes back to the last saved state
  const handleRevertChanges = () => {
    // Use a deep copy to avoid reference issues
    setDaysAvailability(JSON.parse(JSON.stringify(initialDaysAvailability)));
    // Setting state will trigger the useEffect that sets isDirty to false
    showSuccessMessage("Alterações descartadas."); // Optional feedback
  };

  const handleSaveChanges = async () => {
    if (!firestore || !availabilityDocRef) {
      setError("Erro: Firestore não está disponível para salvar.");
      showSuccessMessage("Erro ao salvar: conexão com o banco de dados indisponível.", true);
      return;
    }
    // Show immediate feedback might be better UX
    showSuccessMessage("Salvando alterações...");

    try {
      // Save the entire structure under the 'days' field in the document
      await setDoc(availabilityDocRef, { days: daysAvailability }, { merge: true }); // merge: true avoids overwriting other potential fields
      showSuccessMessage("Todas as alterações foram salvas com sucesso!");
      // Update the initial state to the newly saved state
      setInitialDaysAvailability(JSON.parse(JSON.stringify(daysAvailability))); // Deep copy
      // Reset the dirty state
      setIsDirty(false);
    } catch (e) {
      console.error("Erro ao salvar dados no Firestore:", e);
      setError("Falha ao salvar alterações no banco de dados.");
      showSuccessMessage("Erro ao salvar alterações.", true);
    }
  };

  const showSuccessMessage = (message: string, isError: boolean = false) => {
    setSuccessMessage(message);
    if (isError) {
      // Keep error message longer or handle differently if needed
      setTimeout(() => {
        setSuccessMessage("");
        setError(null); // Clear related error state if message times out
      }, 5000);
    } else {
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    }
  }

  // Handle Loading State
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><p>Carregando configurações...</p></div>;
  }

  // Handle Error State
  if (error && !daysAvailability.length) { // Show blocking error only if data couldn't be loaded at all
    return <Alert variant="destructive"><AlertDescription>{error} Entre em contato com o desenvolvedor do sistema.</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold break-keep">Gerenciar Reservas</h2>

        {/* Group alerts and button on the right */}
        <div className="flex items-end gap-2">
          {/* Alert for unsaved changes */}
          {isDirty && (
            <Alert variant="default" className="border-yellow-500 text-yellow-700 flex items-center justify-between">
              <AlertDescription className="flex items-center">
                Você possui alterações não salvas.
                <Button size="sm" onClick={handleRevertChanges} className="ml-2 h-auto text-yellow-700 hover:text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20">
                  Desfazer
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={handleSaveChanges} disabled={!isDirty || isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {daysAvailability.map((day) => (
              <Button
                key={day.id}
                variant={activeDay === day.id ? "default" : "outline"}
                className={`h-auto py-3 ${!day.enabled ? "opacity-50" : ""}`}
                onClick={() => setActiveDay(day.id)}
              >
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium">{day.shortName}</span>
                </div>
              </Button>
            ))}
          </div>

          {currentDay && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">
                  Configurar {currentDay.name} ({currentDay.shortName})
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor={`enabled-${currentDay.id}`} className="text-sm">
                    {currentDay.enabled ? "Aberto" : "Fechado"}
                  </Label>
                  <Switch
                    id={`enabled-${currentDay.id}`}
                    checked={currentDay.enabled}
                    onCheckedChange={handleToggleDayEnabled}
                    aria-label={`Ativar/Desativar ${currentDay.name}`}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {currentDay.enabled ? (
                  <>
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Horários de Funcionamento</Label>
                      {currentDay.timeRanges.length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhum horário definido. Adicione um intervalo.</p>
                      )}
                      {/* Group time ranges into pairs for row layout */}
                      {Array.from({ length: Math.ceil(currentDay.timeRanges.length / 2) }).map((_, rowIndex) => {
                        const range1Index = rowIndex * 2;
                        const range2Index = range1Index + 1;
                        const range1 = currentDay.timeRanges[range1Index];
                        const range2 = currentDay.timeRanges[range2Index]; // Might be undefined

                        // Helper function to render a single interval block
                        const renderInterval = (range: TimeRange | undefined, index: number) => {
                          if (!range) return <div className="flex-1"></div>; // Placeholder for alignment

                          const openMinutes = timeToMinutes(range.open);
                          let closeMinutes = timeToMinutes(range.close);
                          const minStep = 15;
                          // Adjust initial close minutes for slider display if needed
                          let initialCloseMinutes = closeMinutes;
                          if (initialCloseMinutes <= openMinutes) {
                            initialCloseMinutes = Math.min(1439, openMinutes + minStep);
                          }
                          const sliderValue = [openMinutes, initialCloseMinutes];

                          return (
                            <div key={range.id} className="flex-1 flex flex-col gap-3 p-4 border rounded-md bg-muted/30 min-w-[250px]"> {/* Added flex-1 and min-w */}
                              <div className="flex justify-between items-center">
                                <Label className="text-sm font-medium">Intervalo {index + 1}</Label>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveTimeRange(range.id)}
                                  aria-label="Remover intervalo"
                                  className="text-destructive hover:bg-destructive/10 h-7 w-7"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-lg font-mono px-1">
                                  <span className="px-2 py-0.5 rounded bg-background">
                                    {range.open || "00:00"}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-background">
                                    {range.close || "00:00"}
                                  </span>
                                </div>
                                <Slider
                                  key={`slider-${range.id}`}
                                  id={`range-slider-${range.id}`}
                                  min={0}
                                  max={1439}
                                  step={minStep}
                                  value={sliderValue}
                                  onValueChange={(values) => handleUpdateTimeRangeSlider(range.id, values)}
                                  minStepsBetweenThumbs={1}
                                  className="py-2"
                                />
                              </div>
                            </div>
                          );
                        };

                        return (
                          <div key={`interval-row-${rowIndex}`} className="flex flex-col sm:flex-row gap-4 w-full"> {/* Row container */}
                            {renderInterval(range1, range1Index)}
                            {/* Render second interval or a placeholder if it exists */}
                            {currentDay.timeRanges.length > range1Index + 1
                              ? renderInterval(range2, range2Index)
                              : <div className="flex-1 min-w-[250px]"></div> /* Placeholder for alignment */
                            }
                          </div>
                        );
                      })}

                      <Button variant="outline" size="sm" onClick={handleAddTimeRange}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Adicionar Horário
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="space-y-2 w-full">
                        <Label htmlFor="interval" className="text-base font-medium">Intervalo entre Reservas</Label>
                        <Select
                          value={currentDay.reservationInterval.toString()}
                          onValueChange={(value) => handleUpdateReservationInterval(parseInt(value))}
                        >
                          <SelectTrigger id="interval">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutos</SelectItem>
                            <SelectItem value="30">30 minutos</SelectItem>
                            <SelectItem value="45">45 minutos</SelectItem>
                            <SelectItem value="60">1 hora</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 w-full">
                        <Label htmlFor="last-reservation" className="text-base font-medium">Última Reserva Antes do Fechamento</Label>
                        <Select
                          value={currentDay.lastReservationBeforeClose.toString()}
                          onValueChange={(value) => handleUpdateLastReservationTime(parseInt(value))}
                        >
                          <SelectTrigger id="last-reservation">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No horário de fechamento</SelectItem>
                            <SelectItem value="15">15 minutos antes</SelectItem>
                            <SelectItem value="30">30 minutos antes</SelectItem>
                            <SelectItem value="45">45 minutos antes</SelectItem>
                            <SelectItem value="60">1 hora antes</SelectItem>
                            <SelectItem value="90">1 hora e 30 minutos antes</SelectItem>
                            <SelectItem value="120">2 horas antes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <TooltipProvider>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={handleCopyToAllDays} disabled={!currentDay}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar para Todos os Dias
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copia os horários, intervalo e última reserva <br /> deste dia para todos os outros dias.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {currentDay.name} está definido como fechado. Ative para configurar os horários.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Visualização ( {currentDay?.name} )</CardTitle>
            </CardHeader>
            <CardContent>
              {currentDay && currentDay.enabled ? (
                <div className="space-y-4">
                  {currentDay.timeRanges.length > 0 ? (
                    currentDay.timeRanges.map((range, index) => (
                      <div key={`preview-${range.id}`} className="flex items-start gap-4 text-sm">
                        <div className="flex-grow">
                          {index === 0 && (
                            <div className="flex items-center gap-4">
                              <Clock className="h-6 w-6 text-muted-foreground shrink-0" />
                              <div className="flex flex-col gap-1 text-muted-foreground text-sm">
                                <p>
                                  <b>Intervalo:</b> {currentDay.reservationInterval} min
                                </p>
                                <p>
                                  <b>Última reserva:</b> {currentDay.lastReservationBeforeClose} min antes de fechar
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum intervalo de funcionamento definido.</p>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Horários disponíveis para reserva:</p>
                    {previewTimeSlots.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {previewTimeSlots.map((slot) => (
                          <Badge key={slot} variant="secondary" className="font-mono text-lg font-normal">
                            {slot}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {currentDay.timeRanges.length > 0 ? "Nenhum horário gerado com as configurações atuais." : "Defina um intervalo de funcionamento."}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Dia fechado. Nenhum horário disponível.</p>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
