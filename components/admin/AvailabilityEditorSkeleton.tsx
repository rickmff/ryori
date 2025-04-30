import { Skeleton } from "@/components/ui/skeleton"

export default function AvailabilityEditorSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-40" /> {/* Placeholder for dirty state alert */}
          <Skeleton className="h-10 w-36" /> {/* Placeholder for Save button */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Day Selector Skeleton */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-[60px] w-full" />
            ))}
          </div>

          {/* Configuration Card Skeleton */}
          <Skeleton className="h-[500px] w-full rounded-lg" />
        </div>

        {/* Preview Card Skeleton */}
        <div className="lg:col-span-1 space-y-4">
          <Skeleton className="h-full min-h-[300px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}