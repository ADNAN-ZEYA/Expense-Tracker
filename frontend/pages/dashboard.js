import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Dashboard from '../components/Dashboard'

export default function DashboardPage({ session, theme, toggleTheme }) {
  const router = useRouter()

  useEffect(() => {
    if (!session) router.push('/')
  }, [session, router])

  if (!session) return null
  return <Dashboard session={session} theme={theme} toggleTheme={toggleTheme} />
}