import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Auth from '../components/Auth'
import Dashboard from '../components/Dashboard'

export default function Home({ session, theme, toggleTheme }) {
  const router = useRouter()

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session, router])

  if (session) return null
  return <Auth theme={theme} toggleTheme={toggleTheme} />
}