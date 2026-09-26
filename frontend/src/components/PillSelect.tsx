import { ChevronDown } from 'lucide-react'

/** A native select dressed as a small pill. */
export function PillSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | undefined
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-60 cursor-pointer appearance-none truncate rounded-full border border-line bg-surface/60 py-1.5 pr-8 pl-3.5 text-xs font-medium text-muted transition-colors hover:text-ink"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-faint" />
    </label>
  )
}
