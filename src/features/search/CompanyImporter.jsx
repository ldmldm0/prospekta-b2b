import { useRef, useState } from 'react'
import { Download, FileText, Info, ListPlus, Loader2, Plus, UploadCloud, X } from 'lucide-react'
import { COMPANY_FILE_ACCEPT, INDUSTRIES } from '../../config/searchOptions'
import { usePreferences } from '../../context/PreferencesContext'
import { useToast } from '../../components/ui/Toast'
import { downloadCompanyTemplate } from '../../utils/export'
import LoadedCompaniesTable from './LoadedCompaniesTable'
import { parseCompanies, parseExcelCompanies, readFileAsBase64, readFileAsText, toDomain } from './utils/companyParser'

const TEXT_TYPES = /\.(csv|txt)$/i
const EXCEL_TYPES = /\.(xlsx|xls)$/i
const ALLOWED = /\.(csv|xlsx|xls|txt|pdf)$/i
const MAX_BYTES = 10 * 1024 * 1024

const fmtSize = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/**
 * Módulo "Agregue empresas" + tabla persistente "Mis Empresas Cargadas" (Búsqueda Específica).
 * - Individual: nombre_empresa + sitio_web + sector -> se guarda en PostgreSQL vía gestion-empresas.
 * - Archivo (.csv / .txt / .xlsx / .xls extraído en navegador y guardado en PostgreSQL; .pdf adjuntado).
 * - Lista libre pegada -> se guarda en PostgreSQL.
 */
export default function CompanyImporter({
  companies,
  files,
  onFiles,
  onAddCompanies,
  onDeleteCompanies,
  savingCompanies = false,
}) {
  const { t, lang } = usePreferences()
  const toast = useToast()
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [text, setText] = useState('')
  const [singleName, setSingleName] = useState('')
  const [singleWeb, setSingleWeb] = useState('')
  const [singleIndustry, setSingleIndustry] = useState('')

  const persistEntries = async (entries) => {
    if (!entries.length) return 0
    try {
      return await onAddCompanies(entries)
    } catch (err) {
      toast(err?.message || t('common.error'), 'error')
      return 0
    }
  }

  const addSingle = async () => {
    const nombre_empresa = singleName.trim()
    const dominio_web = toDomain(singleWeb)
    if (!nombre_empresa && !dominio_web) return
    const sector = singleIndustry.trim()
    const entry = {
      nombre_empresa: nombre_empresa || dominio_web.split('.')[0],
      dominio_web,
      sitio_web: dominio_web,
      industria: sector,
      sector,
      pais: '',
      estado: 'pendiente',
    }
    const added = await persistEntries([entry])
    if (added > 0) {
      setSingleName('')
      setSingleWeb('')
      setSingleIndustry('')
      toast(t('search.toast.added', { n: added }))
    }
  }

  const handleFiles = async (fileList) => {
    for (const file of Array.from(fileList)) {
      if (!ALLOWED.test(file.name) || file.size > MAX_BYTES) continue
      if (TEXT_TYPES.test(file.name)) {
        const parsed = parseCompanies(await readFileAsText(file), singleIndustry.trim())
        const added = await persistEntries(parsed)
        if (added > 0) toast(t('search.toast.added', { n: added }))
      } else if (EXCEL_TYPES.test(file.name)) {
        const parsed = parseExcelCompanies(await file.arrayBuffer(), singleIndustry.trim())
        const added = await persistEntries(parsed)
        if (added > 0) toast(t('search.toast.added', { n: added }))
      } else {
        const content = await readFileAsBase64(file)
        onFiles((prev) => [...prev.filter((f) => f.name !== file.name), { name: file.name, size: file.size, type: file.type, content }])
        toast(t('search.toast.fileAdded', { name: file.name }))
      }
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    handleFiles(e.dataTransfer.files)
  }

  const addFromText = async () => {
    const parsed = parseCompanies(text, singleIndustry.trim())
    const added = await persistEntries(parsed)
    if (added > 0) {
      setText('')
      toast(t('search.toast.added', { n: added }))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold">{t('search.companies.title')}</h3>
          <p className="mt-1 text-sm text-muted">{t('search.companies.subtitle')}</p>
        </div>
        <button
          type="button"
          id="download-template"
          onClick={() => {
            downloadCompanyTemplate(lang)
            toast(t('search.toast.template'))
          }}
          className="btn btn-ghost btn-sm shrink-0"
        >
          <Download className="h-4 w-4 text-electric" />
          {t('search.companies.template')}
        </button>
      </div>

      {/* Agregar empresa individual */}
      <div className="rounded-2xl border border-line bg-mist/40 p-4">
        <p className="mb-2.5 text-xs font-semibold text-ink">{t('search.companies.singleTitle')}</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
          <input
            type="text"
            id="company-single-name"
            value={singleName}
            onChange={(e) => setSingleName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSingle())}
            placeholder={t('search.companies.singleNamePh')}
            className="field sm:col-span-4"
          />
          <input
            type="text"
            id="company-single-web"
            value={singleWeb}
            onChange={(e) => setSingleWeb(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSingle())}
            placeholder={t('search.companies.singleWebPh')}
            className="field sm:col-span-3"
          />
          <input
            type="text"
            id="company-single-industry"
            list="company-industries-datalist"
            value={singleIndustry}
            onChange={(e) => setSingleIndustry(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSingle())}
            placeholder={t('search.companies.singleIndustryPh')}
            className="field sm:col-span-3"
          />
          <datalist id="company-industries-datalist">
            {INDUSTRIES.map((ind) => (
              <option key={ind.value} value={ind.value}>
                {ind[lang]}
              </option>
            ))}
          </datalist>
          <button
            type="button"
            id="company-single-add"
            onClick={addSingle}
            disabled={savingCompanies || (!singleName.trim() && !singleWeb.trim())}
            className="btn btn-primary btn-sm sm:col-span-2"
          >
            {savingCompanies ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('search.companies.singleAdd')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Zona de carga */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
            drag ? 'border-electric bg-electric-50' : 'border-line bg-mist/60 hover:border-electric/50'
          }`}
          id="company-dropzone"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-electric-50 text-electric">
            <UploadCloud className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">
            {t('search.companies.drop')} <span className="text-electric underline">{t('search.companies.browse')}</span>
          </p>
          <p className="mt-1 text-xs text-muted">{t('search.companies.formats')}</p>
          <input
            ref={inputRef}
            type="file"
            accept={COMPANY_FILE_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {/* Lista libre */}
        <div className="flex flex-col">
          <label htmlFor="company-paste" className="field-label">
            {t('search.companies.paste')}
          </label>
          <textarea
            id="company-paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('search.companies.pastePh')}
            rows={5}
            className="field flex-1 resize-y font-mono text-xs"
          />
          <button
            type="button"
            id="company-add-text"
            onClick={addFromText}
            disabled={savingCompanies || !text.trim()}
            className="btn btn-primary btn-sm mt-2 self-end"
          >
            {savingCompanies ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListPlus className="h-4 w-4" />}
            {t('search.companies.addFromText')}
          </button>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-xl bg-electric-50 px-4 py-3 text-xs leading-relaxed text-ink">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-electric" />
        {t('search.companies.note')}
      </p>

      {files.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-ink">{t('search.companies.filesTitle')}</p>
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5">
                <span className="flex min-w-0 items-center gap-2.5">
                  <FileText className="h-4.5 w-4.5 shrink-0 text-electric" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{f.name}</span>
                    <span className="block text-[11px] text-muted">
                      {fmtSize(f.size)} · {t('search.companies.fileQueued')}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onFiles((prev) => prev.filter((x) => x.name !== f.name))}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-mist hover:text-ink cursor-pointer"
                  aria-label={t('search.companies.remove')}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabla persistente y paginada "Mis Empresas Cargadas" */}
      <LoadedCompaniesTable companies={companies} onDeleteCompanies={onDeleteCompanies} saving={savingCompanies} />
    </div>
  )
}
