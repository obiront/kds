import type { Station } from '../types/models'
import { ALL_STATIONS, type StationFilterValue } from '../types/board'

interface StationFilterProps {
  stations: Station[]
  value: StationFilterValue
  onChange: (value: StationFilterValue) => void
}

export function StationFilter({ stations, value, onChange }: StationFilterProps) {
  const options: { key: StationFilterValue; label: string }[] = [
    { key: ALL_STATIONS, label: 'Всі' },
    ...stations.map((station) => ({ key: station.id, label: station.name_uk })),
  ]

  return (
    <div className="flex gap-3">
      {options.map((option) => {
        const isActive = option.key === value

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            aria-pressed={isActive}
            className={`min-h-16 rounded-lg px-8 text-2xl font-semibold transition-colors ${
              isActive
                ? 'bg-amber-500 text-neutral-950'
                : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
