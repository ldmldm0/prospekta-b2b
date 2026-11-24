import { ALL_COUNTRIES_VALUE, ALL_SIZES_VALUE, COUNTRIES, SIZES } from '../../config/searchOptions'
import { usePreferences } from '../../context/PreferencesContext'
import { useToast } from '../../components/ui/Toast'
import TagSelect from '../../components/ui/TagSelect'
import CompanyImporter from './CompanyImporter'
import { ChipToggleGroup, ProfileField, QuantityField, SectionLabel, SegmentationFields } from './fields'

/**
 * Formulario de Búsqueda Específica (sobre la base persistente "Mis Empresas Cargadas" del cliente).
 * Incluye los mismos selectores completos que Exploratoria: Países (con "Todos los países"),
 * Tamaño de empresa (con "Todos los tamaños"), Cantidad máxima de prospectos y Perfil (máx. 60 palabras).
 */
export default function EspecificaForm({
  value,
  onChange,
  companies,
  files,
  onFiles,
  onAddCompanies,
  onDeleteCompanies,
  savingCompanies,
}) {
  const { t } = usePreferences()
  const toast = useToast()
  const set = (k) => (v) => onChange((prev) => ({ ...prev, [k]: v }))
  const allCountriesSelected = !value.paises?.length || value.paises.includes(ALL_COUNTRIES_VALUE)

  const toggleAllCountries = () => {
    set('paises')(allCountriesSelected ? ['Colombia'] : [ALL_COUNTRIES_VALUE])
  }

  return (
    <div className="space-y-8">
      <CompanyImporter
        companies={companies}
        files={files}
        onFiles={onFiles}
        onAddCompanies={onAddCompanies}
        onDeleteCompanies={onDeleteCompanies}
        savingCompanies={savingCompanies}
      />

      <div className="grid grid-cols-1 gap-6 border-t border-line pt-7 lg:grid-cols-2">
        <ProfileField
          id="esp-perfil"
          value={value.perfil}
          onChange={set('perfil')}
          hintKey="search.perfilHintEsp"
          onExample={() => toast(t('search.toast.profile'), 'info')}
        />
        <div className="grid grid-cols-1 content-start gap-6">
          <div>
            <SectionLabel
              htmlFor="esp-paises"
              aside={
                <button
                  type="button"
                  onClick={toggleAllCountries}
                  className="text-xs font-semibold text-electric hover:underline cursor-pointer"
                >
                  {allCountriesSelected ? t('search.allCountriesActive') : t('search.selectAllCountries')}
                </button>
              }
            >
              {t('search.countries')}
            </SectionLabel>
            <TagSelect
              id="esp-paises"
              options={COUNTRIES}
              value={value.paises}
              onChange={set('paises')}
              exclusiveValue={ALL_COUNTRIES_VALUE}
              placeholder={t('search.countriesPh')}
            />
          </div>
          <QuantityField id="esp-cantidad" value={value.cantidad} onChange={set('cantidad')} />
        </div>
      </div>

      <div className="border-t border-line pt-7">
        <SectionLabel aside={<span className="text-[11px] text-muted">{t('search.multi')}</span>}>{t('search.sizes')}</SectionLabel>
        <ChipToggleGroup idPrefix="esp-size" options={SIZES} value={value.tamanos} onChange={set('tamanos')} exclusive={ALL_SIZES_VALUE} />
      </div>

      <div className="border-t border-line pt-7">
        <SectionLabel>{t('search.segmentation')}</SectionLabel>
        <SegmentationFields idPrefix="esp" areas={value.areas} niveles={value.niveles} onAreas={set('areas')} onNiveles={set('niveles')} />
      </div>
    </div>
  )
}
