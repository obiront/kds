import type { Station } from '../types/models'
import { ALL_STATIONS, type StationFilterValue } from '../types/board'

interface StationFilterProps {
  stations: Station[]
  value: StationFilterValue
  onChange: (value: StationFilterValue) => void
}

/**
 * Station selection is a status, not the board's primary action, so the active
 * chip is filled with the cool token. The warm accent stays reserved for the
 * one ticket that leads.
 */
export function StationFilter({ stations, value, onChange }: StationFilterProps) {
  const options: { key: StationFilterValue; label: string }[] = [
    { key: ALL_STATIONS, label: 'Всі' },
    ...stations.map((station) => ({ key: station.id, label: station.name_uk })),
  ]

  return (
    <div className="flex gap-2">
      {options.map((option) => {
        const isActive = option.key === value

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            aria-pressed={isActive}
            className={`font-heading tracking-heading min-h-14 rounded-control border px-4 text-xl font-medium transition-colors ${
              isActive
                ? 'border-cool bg-cool text-canvas'
                : 'border-edge bg-surface text-ink hover:bg-surface-raised hover:border-cool'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
