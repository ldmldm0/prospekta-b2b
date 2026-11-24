import { FileText, ShieldCheck } from 'lucide-react'
import Logo from '../brand/Logo'
import { BRAND } from '../../config/brand'
import { usePreferences } from '../../context/PreferencesContext'
import { usePublicModals } from '../../context/PublicModalContext'

const YEAR = 2026

/**
 * Footer corporativo ejecutivo en 3 columnas (Marca · Plataforma · Legal y Soporte).
 * - Los enlaces de Plataforma y Legal abren directamente los modales globales consistentes.
 * - La barra inferior queda 100% limpia para la firma institucional del cliente.
 */
export default function Footer() {
  const { t } = usePreferences()
  const { openHowItWorks, openPackages, openRequestAccess, openCreditPolicy, openTerms } = usePublicModals()

  return (
    <footer className="border-t border-line bg-mist/70">
      <div className="container-page py-12 sm:py-14">
        {/* 3 Columnas corporativas */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Columna 1: Marca */}
          <div className="md:col-span-5">
            <Logo size="md" />
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-muted sm:text-sm">
              {t('footer.brandDescription')}
            </p>
          </div>

          {/* Columna 2: Plataforma */}
          <div className="md:col-span-4">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              {t('footer.colPlatform')}
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  id="footer-how-it-works"
                  onClick={openHowItWorks}
                  className="text-muted transition-colors hover:text-electric cursor-pointer"
                >
                  {t('footer.linkHowItWorks')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  id="footer-packages"
                  onClick={openPackages}
                  className="text-muted transition-colors hover:text-electric cursor-pointer"
                >
                  {t('footer.linkPackages')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  id="footer-request-access"
                  onClick={() => openRequestAccess()}
                  className="text-muted transition-colors hover:text-electric cursor-pointer"
                >
                  {t('footer.linkRequestAccess')}
                </button>
              </li>
            </ul>
          </div>

          {/* Columna 3: Legal y Soporte */}
          <div className="md:col-span-3">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              {t('footer.colLegal')}
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  id="footer-credit-policy-btn"
                  onClick={openCreditPolicy}
                  className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-electric cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-electric" />
                  <span>{t('footer.linkCreditPolicy')}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  id="footer-terms-btn"
                  onClick={openTerms}
                  className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-electric cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-electric" />
                  <span>{t('footer.linkTerms')}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra inferior 100% limpia con la firma institucional de la marca */}
        <div className="mt-10 border-t border-line/70 pt-6 text-center text-xs text-muted">
          <p>
            © {YEAR} {BRAND.name} - {BRAND.signature} · {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  )
}
