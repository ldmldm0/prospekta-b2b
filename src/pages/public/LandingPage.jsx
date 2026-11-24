import { useState } from 'react'
import PublicNavbar from '../../components/layout/PublicNavbar'
import Footer from '../../components/layout/Footer'
import Hero from '../../components/landing/Hero'
import HowItWorks from '../../components/landing/HowItWorks'
import Packages from '../../components/landing/Packages'
import Contact from '../../components/landing/Contact'
import { usePublicModals } from '../../context/PublicModalContext'
import { useReveal } from '../../hooks/useReveal'
import { useRouter } from '../../router'

/**
 * Vista pública: visible solo SIN sesión. No incluye el buscador.
 * Mantiene las secciones en la página para scroll manual y abre modales emergentes
 * al interactuar con la navegación o los botones de paquetes.
 */
export default function LandingPage() {
  const { navigate } = useRouter()
  const { openRequestAccess } = usePublicModals()
  const [planRequest, setPlanRequest] = useState(null)
  useReveal()

  const handleSelectPlan = (id) => {
    setPlanRequest({ id, at: Date.now() })
    openRequestAccess(id)
  }

  return (
    <>
      <PublicNavbar onLogin={() => navigate('/login')} />
      <main>
        <Hero />
        <HowItWorks />
        <Packages onSelectPlan={handleSelectPlan} />
        <Contact planRequest={planRequest} />
      </main>
      <Footer />
    </>
  )
}
