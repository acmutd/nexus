import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirebaseAuth, initFirebase, getFirebaseFirestore } from '../firebase'
import LoadingScreen from '../components/LoadingScreen'
import { Navigate, useLocation } from 'react-router-dom'
import { getDoc, doc } from 'firebase/firestore'

// Single source of truth for where to send users after logout/delete.
export const LOGOUT_REDIRECT_PATH = '/'

// Default redirect for unauthenticated access to protected routes.
export const UNAUTH_REDIRECT_PATH = '/login'

// Helpers for redirect handling (single source of truth)
export function setPostLogoutRedirect(path = LOGOUT_REDIRECT_PATH) {
  try {
    sessionStorage.setItem('postLogoutRedirect', path || LOGOUT_REDIRECT_PATH)
  } catch (e) {
    console.warn('setPostLogoutRedirect failed', e)
  }
}

export function consumePostLogoutRedirect() {
  try {
    const target = sessionStorage.getItem('postLogoutRedirect')
    if (target) sessionStorage.removeItem('postLogoutRedirect')
    return target || null
  } catch (e) {
    console.warn('consumePostLogoutRedirect failed', e)
    return null
  }
}

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
      
      // If no Firestore document exists, user is still in onboarding
      if (!snap.exists()) {
        const googleLinked = (u.providerData || []).some(p => p.providerId === 'google.com')
        const res = { 
          loaded: true, 
          hasCourses: false, 
          googleLinked, 
          discordLinked: false, 
          accountLinkingSkipped: false 
        };
        setOnboarding(res);
        return res;
      }
      
      // Document exists - get onboarding state from it
      const data = snap.data() || {}
      const hasCourses = Array.isArray(data.courses) && data.courses.length > 0
      const discordLinked = !!(data.discord && data.discord.id)
      const googleLinked = (u.providerData || []).some(p => p.providerId === 'google.com')
      // Backwards-compatible: some records only stored accountLinkingSkippedAt
      const accountLinkingSkipped = !!(data.accountLinkingSkipped ?? data.accountLinkingSkippedAt)
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
      // Firebase not initialized yet (ex init failed). Treat as logged-out.
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

  if (loading) return null
  if (!user) {
    // Honor a one-time post-logout/delete redirect, else fall back to login
    const target = consumePostLogoutRedirect()
    const dest = target || UNAUTH_REDIRECT_PATH || '/login'
    return <Navigate to={dest} state={{ from: location }} replace />
  }
  return children
}

// Redirect authenticated users away from routes meant for guests (e.g., signup/login)
export function RedirectIfAuthenticated({ children }) {
  const { user, loading, onboarding } = useAuth()

  // Wait until both auth and onboarding are resolved to avoid flicker/loops
  if (loading || !onboarding.loaded) return <LoadingScreen />

  if (user) {
    // If they haven't linked courses yet, push them back into onboarding
    if (!onboarding.hasCourses) return <Navigate to="/CourseLinking" replace />
    return <Navigate to="/home" replace />
  }

  return children
}

// RequireOnboarding wraps onboarding routes to enforce progression order
export function RequireOnboarding({ step = 'course', children }) {
  // step: 'course' or 'account'
  const { onboarding, onboarding: { loaded }, user, refreshOnboarding } = useAuth()
  const location = useLocation()
  const forceCourseRelink = location.state && location.state.forceCourseRelink;
  const [rechecking, setRechecking] = useState(false)
  const [rechecked, setRechecked] = useState(false)

  // Check if user is in pre-Firestore onboarding flow
  const [pendingOnboardingData, setPendingOnboardingData] = useState(null)
  
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('pendingOnboarding')
      setPendingOnboardingData(pending ? JSON.parse(pending) : null)
    } catch (e) {
      console.warn('Failed to parse pendingOnboarding', e)
      setPendingOnboardingData(null)
    }
  }, [location.pathname]) // Re-check when navigating

  useEffect(() => {
    if (!loaded) return
    if (!user) return
    if (onboarding.hasCourses) return
    if (pendingOnboardingData) return // Skip recheck if in pre-Firestore flow
    if (rechecking || rechecked) return

    let cancelled = false
    const run = async () => {
      setRechecking(true)
      try {
        await refreshOnboarding(user)
      } catch (e) {
        console.warn('RequireOnboarding recheck failed', e)
      } finally {
        if (!cancelled) setRechecked(true)
        setRechecking(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [loaded, user, onboarding.hasCourses, refreshOnboarding, rechecking, rechecked, pendingOnboardingData])

  if (!loaded || rechecking) return null

  // If not signed in - handled by RequireAuth, but be defensive
  if (!user) return <Navigate to="/login" replace />

  if (step === 'course') {
    // Allow forcing course relink even if onboarding still shows courses (ex Firestore eventual consistency)
    if (forceCourseRelink) return children

    // Check for courses in either Firestore OR sessionStorage (pre-Firestore flow)
    const hasCourses = onboarding.hasCourses || 
      (pendingOnboardingData && Array.isArray(pendingOnboardingData.courses) && pendingOnboardingData.courses.length > 0)

    // If user already completed course linking, send them forward to account linking unless they've dismissed it
    if (hasCourses) {
      const needsAccountLinking = !onboarding.discordLinked && 
        !(pendingOnboardingData?.discord?.id) // Also check sessionStorage for Discord
      const accountLinkingSkipped = onboarding.accountLinkingSkipped || pendingOnboardingData?.accountLinkingSkipped
      
      if (needsAccountLinking && !accountLinkingSkipped) return <Navigate to="/accountlinking" replace />
      return <Navigate to="/home" replace />
    }
    return children
  }

  if (step === 'account') {
    const hasCourses = onboarding.hasCourses || 
      (pendingOnboardingData && Array.isArray(pendingOnboardingData.courses) && pendingOnboardingData.courses.length > 0)
    
    // can't visit account step before finishing courses
    if (!hasCourses) return <Navigate to="/CourseLinking" replace />

    // Check if Discord is linked in either Firestore OR sessionStorage
    const discordLinked = onboarding.discordLinked || !!(pendingOnboardingData?.discord?.id)
    const accountLinkingSkipped = onboarding.accountLinkingSkipped || pendingOnboardingData?.accountLinkingSkipped

    // Only allow when user still needs to link Discord and hasn't skipped
    const needsAccountLinking = !discordLinked && !accountLinkingSkipped;
    if (!needsAccountLinking) return <Navigate to="/home" replace />

    return children
  }

  return children
}

// RequireCourses enforces that the user has completed course linking before accessing core app pages
export function RequireCourses({ children }) {
  const { user, loading, onboarding, refreshOnboarding } = useAuth()
  const [rechecking, setRechecking] = useState(false)
  const [rechecked, setRechecked] = useState(false)

  // If courses look missing, double-check once before redirecting to avoid flicker.
  useEffect(() => {
    if (loading) return
    if (!user) return
    if (!onboarding.loaded) return
    if (onboarding.hasCourses) return
    if (rechecking || rechecked) return

    let cancelled = false
    const run = async () => {
      setRechecking(true)
      try {
        await refreshOnboarding(user)
      } catch (e) {
        console.warn('RequireCourses recheck failed', e)
      } finally {
        if (!cancelled) setRechecked(true)
        setRechecking(false)
      }
    }
    run()

    return () => { cancelled = true }
  }, [loading, user, onboarding, refreshOnboarding, rechecking, rechecked])

  if (loading || !onboarding.loaded || rechecking) return null
  if (!user) return <Navigate to="/login" replace />
  if (!onboarding.hasCourses && rechecked) return <Navigate to="/CourseLinking" replace />
  if (!onboarding.hasCourses) return null
  return children
}

export default AuthContext
