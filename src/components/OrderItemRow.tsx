import { formatGrams } from '../lib/format'
import type { Modifier, OrderItem } from '../types/models'

interface OrderItemRowProps {
  item: OrderItem
  modifiers: Modifier[]
}

/**
 * One line of an order. Weight and portion lines are told apart two ways at
 * once: the separator ("—" against "×") and the colour of the amount, so the
 * distinction survives being read from across the kitchen.
 */
export function OrderItemRow({ item, modifiers }: OrderItemRowProps) {
  const isWeight = item.unit_type === 'weight'

  return (
    <li className="py-2">
      <div className="flex flex-wrap items-baseline gap-x-2 text-2xl leading-tight">
        <span className="text-neutral-100">{item.item_name_snapshot}</span>

        {/* Separator and amount stay on one line: "— 430 г" must never break. */}
        <span className="whitespace-nowrap">
          <span className="text-neutral-500">{isWeight ? '—' : '×'}</span>{' '}
          {isWeight ? (
            <span className="font-bold text-amber-300">
              {item.weight_grams === null ? '—' : formatGrams(item.weight_grams)}
            </span>
          ) : (
            <span className="font-bold text-sky-300">{item.quantity ?? '—'}</span>
          )}
        </span>
      </div>

      {modifiers.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {modifiers.map((modifier) => (
            <li
              key={modifier.id}
              className="rounded bg-neutral-700 px-2.5 py-1 text-lg text-neutral-100"
            >
              {modifier.name_uk}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
