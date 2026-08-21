import { formatGrams } from '../lib/format'
import type { Modifier, OrderItem } from '../types/models'

interface OrderItemRowProps {
  item: OrderItem
  modifiers: Modifier[]
}

/**
 * One line of an order. Weight and portion lines differ by separator ("—"
 * against "×") and by colour: grams read in white because they drive the
 * cooking, portion counts in the cool token. Neither uses the warm accent —
 * that belongs to the leading ticket alone.
 */
export function OrderItemRow({ item, modifiers }: OrderItemRowProps) {
  const isWeight = item.unit_type === 'weight'

  return (
    <li className="py-2">
      <div className="flex flex-wrap items-baseline gap-x-2 text-xl">
        <span className="text-ink">{item.item_name_snapshot}</span>

        {/* Separator and amount stay on one line: "— 430 г" must never break. */}
        <span className="whitespace-nowrap tabular-nums">
          <span className="text-muted">{isWeight ? '—' : '×'}</span>{' '}
          {isWeight ? (
            <span className="text-ink font-semibold">
              {item.weight_grams === null ? '—' : formatGrams(item.weight_grams)}
            </span>
          ) : (
            <span className="text-cool font-semibold">{item.quantity ?? '—'}</span>
          )}
        </span>
      </div>

      {modifiers.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {modifiers.map((modifier) => (
            <li
              key={modifier.id}
              className="border-edge bg-surface-raised text-cool rounded-control border px-2 py-2 text-lg leading-none"
            >
              {modifier.name_uk}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
