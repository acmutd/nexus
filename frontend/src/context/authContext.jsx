import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirebaseAuth, initFirebase, getFirebaseFirestore } from '../firebase'
import LoadingScreen from '../components/LoadingScreen'
import { Navigate, useLocation } from 'react-router-dom'
import { getDoc, doc } from 'firebase/firestore'

const AuthContext = createContext({ user: null, loading: true })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // onboarding state: hasCourses, googleLinked (from auth), discordLinked (from firestore), accountLinkingSkipped (from firestore)
  const [onboarding, setOnboarding] = useState({ loaded: false, hasCourses: false, googleLinked: false, discordLinked: false, accountLinkingSkipped: false })

  const refreshOnboarding = async (u) => {
    if (!u) {
      const result = { loaded: true, hasCourses: false, googleLinked: false, discordLinked: false, accountLinkingSkipped: false };
      setOnboarding(result);
      return result;
    }

    try {
      const { db } = await initFirebase()
      const userRef = doc(db, 'users', u.uid)
      const snap = await getDoc(userRef)
      const data = snap.exists() ? (snap.data() || {}) : {}
      const hasCourses = Array.isArray(data.courses) && data.courses.length > 0
      const discordLinked = !!(data.discord && data.discord.id)
      const googleLinked = (u.providerData || []).some(p => p.providerId === 'google.com')
      const accountLinkingSkipped = !!data.accountLinkingSkipped
      const res = { loaded: true, hasCourses, googleLinked, discordLinked, accountLinkingSkipped };
      setOnboarding(res);
      return res;
    } catch (e) {
      console.error('refreshOnboarding error:', e)
      // still set loaded so UI won't block forever
      const googleLinked = (u.providerData || []).some(p => p.providerId === 'google.com')
      const res = { loaded: true, hasCourses: false, googleLinked, discordLinked: false, accountLinkingSkipped: false };
      setOnboarding(res);
      return res;
    }
  }

  useEffect(() => {
    let unsub
    try {
      const auth = getFirebaseAuth()
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u)
        setLoading(false)
        // refresh onboarding whenever auth state changes
        refreshOnboarding(u)
      })
    } catch (err) {
      // Firebase not initialized yet (e.g., init failed). Treat as logged-out.
      console.warn('AuthProvider: firebase auth not ready', err)
      setUser(null)
      setLoading(false)
      setOnboarding({ loaded: true, hasCourses: false, googleLinked: false, discordLinked: false, accountLinkingSkipped: false })
    }

    // Listen for manual refresh events dispatched after onboarding actions so other components
    // can trigger an immediate refetch of onboarding state (used after saving courses/linking accounts)
    const onRefresh = async () => {
      try {
        const auth = getFirebaseAuth();
        const current = auth && auth.currentUser ? auth.currentUser : null;
        await refreshOnboarding(current);
      } catch (e) {
        // If auth isn't ready, just attempt a refresh with null to reset onboarding
        await refreshOnboarding(null);
      }
    }
    window.addEventListener('refreshOnboarding', onRefresh)

    return () => {
      if (unsub) unsub()
      window.removeEventListener('refreshOnboarding', onRefresh)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, onboarding, refreshOnboarding }}>
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

// RequireOnboarding wraps onboarding routes to enforce progression order
export function RequireOnboarding({ step = 'course', children }) {
  // step: 'course' or 'account'
  const { onboarding, onboarding: { loaded }, user } = useAuth()

  if (!loaded) return <LoadingScreen />

  // If not signed in - handled by RequireAuth, but be defensive
  if (!user) return <Navigate to="/login" replace />

  if (step === 'course') {
    // If user already completed course linking, send them forward to account linking unless they've dismissed it
    if (onboarding.hasCourses) {
      const needsAccountLinking = !onboarding.discordLinked;
      if (needsAccountLinking && !onboarding.accountLinkingSkipped) return <Navigate to="/accountlinking" replace />
      return <Navigate to="/home" replace />
    }
    return children
  }

  if (step === 'account') {
    // can't visit account step before finishing courses
    if (!onboarding.hasCourses) return <Navigate to="/CourseLinking" replace />

    // Account linking is optional — allow visiting even if already linked/skipped
    return children
  }

  return children
}

// RequireCourses enforces that the user has completed course linking before accessing core app pages
export function RequireCourses({ children }) {
  const { user, loading, onboarding } = useAuth()

  if (loading || !onboarding.loaded) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!onboarding.hasCourses) return <Navigate to="/CourseLinking" replace />
  return children
}

export default AuthContext
