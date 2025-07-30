import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number[]
  onValueChange: (value: number[]) => void
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onValueChange, ...props }, ref) => {
    return (
      <input
        type="range"
        ref={ref}
        className={cn(
          "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer",
          "slider-thumb:appearance-none slider-thumb:w-4 slider-thumb:h-4",
          "slider-thumb:bg-primary slider-thumb:rounded-full",
          className
        )}
        value={value[0]}
        onChange={(e) => onValueChange([parseFloat(e.target.value)])}
        {...props}
      />
    )
  }
)
Slider.displayName = "Slider"

export { Slider }