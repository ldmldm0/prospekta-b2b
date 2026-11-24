/** Tarjeta de métrica reutilizable para el Dashboard. */
export default function StatCard({ icon: Icon, label, value, hint, tone = 'light' }) {
  const navy = tone === 'navy'
  return (
    <div className={`rounded-2xl p-5 ${navy ? 'surface-navy text-white shadow-lift' : 'card'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs font-medium ${navy ? 'text-blue-100/80' : 'text-muted'}`}>{label}</p>
        {Icon && (
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${navy ? 'bg-white/10 text-electric' : 'bg-electric-50 text-electric'}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={`mt-3 font-display text-3xl font-extrabold tracking-tight ${navy ? 'text-white' : 'text-ink'}`}>{value}</p>
      {hint && <p className={`mt-1 text-xs ${navy ? 'text-blue-100/70' : 'text-muted'}`}>{hint}</p>}
    </div>
  )
}
