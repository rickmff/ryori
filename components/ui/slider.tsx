"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  // Determine the initial values to render thumbs for.
  // If 'value' is provided, use it; otherwise, use 'defaultValue' if provided,
  // or default to a single thumb at the minimum value if neither is present.
  const currentValues = value ?? props.defaultValue ?? [props.min ?? 0];
  // Ensure currentValues is always an array for mapping thumbs
  const valuesArray = Array.isArray(currentValues) ? currentValues : [currentValues];

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      value={value} // Pass the original value prop down
      {...props} // Pass the rest of the props
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {/* Map over the values array to render a thumb for each value */}
      {valuesArray.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index} // Use index as key for the thumbs
          className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
