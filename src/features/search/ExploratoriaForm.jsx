import { ALL_COUNTRIES_VALUE, ALL_SIZES_VALUE, COUNTRIES, INDUSTRIES, SIZES } from '../../config/searchOptions'
import { usePreferences } from '../../context/PreferencesContext'
import { useToast } from '../../components/ui/Toast'
import TagSelect from '../../components/ui/TagSelect'
import { ChipToggleGroup, ProfileField, QuantityField, SectionLabel, SegmentationFields } from './fields'

/** Formulario de Búsqueda Exploratoria (IA descubre empresas nuevas). */
export default function ExploratoriaForm({ value, onChange }) {
  const { t } = usePreferences()
  const toast = useToast()
  const set = (k) => (v) => onChange((prev) => ({ ...prev, [k]: v }))
  const allHint = <span className="text-[11px] text-muted">{t('search.emptyMeansAll')}</span>

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProfileField id="exp-perfil" value={value.perfil} onChange={set('perfil')} onExample={() => toast(t('search.toast.profile'), 'info')} />
        <div className="grid grid-cols-1 content-start gap-6">
          <div>
            <SectionLabel htmlFor="exp-industrias" aside={allHint}>
              {t('search.industries')}
            </SectionLabel>
            <TagSelect id="exp-industrias" options={INDUSTRIES} value={value.industrias} onChange={set('industrias')} placeholder={t('search.industriesPh')} />
          </div>
          <div>
            <SectionLabel htmlFor="exp-paises" aside={allHint}>
              {t('search.countries')}
            </SectionLabel>
            <TagSelect
              id="exp-paises"
              options={COUNTRIES}
              value={value.paises}
              onChange={set('paises')}
              exclusiveValue={ALL_COUNTRIES_VALUE}
              placeholder={t('search.countriesPh')}
            />
          </div>
          <QuantityField id="exp-cantidad" value={value.cantidad} onChange={set('cantidad')} />
        </div>
      </div>

      <div className="border-t border-line pt-7">
        <SectionLabel aside={<span className="text-[11px] text-muted">{t('search.multi')}</span>}>{t('search.sizes')}</SectionLabel>
        <ChipToggleGroup idPrefix="exp-size" options={SIZES} value={value.tamanos} onChange={set('tamanos')} exclusive={ALL_SIZES_VALUE} />
      </div>

      <div className="border-t border-line pt-7">
        <SegmentationFields idPrefix="exp" areas={value.areas} niveles={value.niveles} onAreas={set('areas')} onNiveles={set('niveles')} />
      </div>
    </div>
  )
}
