import { createContext, useState, useEffect, useContext } from "react";

export const MobileContext = createContext()

export function MobileProvider({children}) {
  const [isMobile, setIsMobile] = useState(false)
  const [isSmallMobile, setIsSmallMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      setIsSmallMobile(window.innerWidth <= 400)
    }

    checkMobile()

    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <MobileContext.Provider value={{ isMobile, isSmallMobile }}>
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

