import { useId, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'

const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/**
 * Selector múltiple con etiquetas + autocompletado + valores personalizados.
 * Si se pasa `exclusiveValue` (ej. "Todos"), seleccionarlo reemplaza el resto,
 * y seleccionar otra opción quita automáticamente `exclusiveValue`.
 */
export default function TagSelect({ options, value, onChange, placeholder, allowCustom = true, exclusiveValue, id, label }) {
  const { lang, t } = usePreferences()
  const autoId = useId()
  const inputId = id || autoId
  const listId = `${inputId}-list`
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const labelOf = (v) => options.find((o) => o.value === v)?.[lang] ?? v

  const filtered = useMemo(() => {
    const q = norm(query.trim())
    return options.filter((o) => !value.includes(o.value) && (!q || norm(o[lang]).includes(q) || norm(o.value).includes(q)))
  }, [options, value, query, lang])

  const trimmed = query.trim()
  const exact = options.find((o) => norm(o[lang]) === norm(trimmed) || norm(o.value) === norm(trimmed))
  const showCustom = allowCustom && trimmed && !exact && !value.some((v) => norm(v) === norm(trimmed))
  const items = [...filtered.map((o) => ({ type: 'opt', value: o.value, label: o[lang] })), ...(showCustom ? [{ type: 'custom', value: trimmed }] : [])]

  const add = (v) => {
    if (!v || value.includes(v)) return
    if (exclusiveValue && v === exclusiveValue) {
      onChange([exclusiveValue])
    } else if (exclusiveValue) {
      onChange([...value.filter((x) => x !== exclusiveValue), v])
    } else {
      onChange([...value, v])
    }
    setQuery('')
    setActive(0)
    inputRef.current?.focus()
  }
  const remove = (v) => onChange(value.filter((x) => x !== v))

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || (e.key === ',' && trimmed)) {
      e.preventDefault()
      if (open && items[active]) add(items[active].value)
      else if (exact) add(exact.value)
      else if (allowCustom && trimmed) add(trimmed)
    } else if (e.key === 'Backspace' && !query && value.length) {
      remove(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <div
        className="field flex min-h-[46px] cursor-text flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-electric focus-within:shadow-[0_0_0_4px_rgb(0_114_255/0.14)]"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((v) => (
          <span key={v} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-electric-50 py-1 pl-2.5 pr-1 text-xs font-semibold text-ink animate-pop">
            <span className="truncate">{labelOf(v)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                remove(v)
              }}
              className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-muted hover:bg-electric hover:text-white cursor-pointer"
              aria-label={t('search.removeTag', { v: labelOf(v) })}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm text-ink outline-none placeholder:text-muted/70"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lift animate-pop"
        >
          {items.length === 0 && <li className="px-3 py-2.5 text-xs text-muted">{t('search.noMatches')}</li>}
          {items.map((it, i) => (
            <li
              key={`${it.type}-${it.value}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                add(it.value)
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ${i === active ? 'bg-electric-50 text-ink' : 'text-ink-soft'}`}
            >
              {it.type === 'custom' ? (
                <>
                  <Plus className="h-3.5 w-3.5 text-electric" />
                  {t('search.addCustom', { v: it.value })}
                </>
              ) : (
                it.label
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
