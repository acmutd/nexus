import { createContext, useState, useEffect, useContext } from "react";

export const MobileContext = createContext()

export function MobileProvider({children}) {
  const [isMobile, setIsMobile] = useState(false)
  const [isScreenMedium, setIsScreenMedium] = useState(false)
  const [isScreenSmall, setIsScreenSmall] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      setIsScreenSmall(window.innerWidth <= 950)
      setIsScreenMedium(window.innerWidth <= 1200)
    }

    checkMobile()

    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <MobileContext.Provider value={{ isMobile, isScreenMedium, isScreenSmall }}>
      {children}
    </MobileContext.Provider>
  )
}

export function useMobile() {
  const context = useContext(MobileContext)   

  if(!context) {
    throw new Error('useMobile must be used within MobileProvider')
  }

  return context;
}

