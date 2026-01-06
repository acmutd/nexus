import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirebaseAuth } from '../firebase'
import LoadingScreen from '../components/LoadingScreen'
import { Navigate, useLocation } from 'react-router-dom'

const AuthContext = createContext({ user: null, loading: true })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub
    try {
      const auth = getFirebaseAuth()
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u)
        setLoading(false)
      })
    } catch (err) {
      // Firebase not initialized yet (e.g., init failed). Treat as logged-out.
      console.warn('AuthProvider: firebase auth not ready', err)
      setUser(null)
      setLoading(false)
    }

    return () => {
      if (unsub) unsub()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

export default AuthContext
