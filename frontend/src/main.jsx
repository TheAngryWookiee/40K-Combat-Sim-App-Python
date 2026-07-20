import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, useNavigate } from 'react-router-dom'
import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react'
import '@neondatabase/neon-js/ui/css'
import './index.css'
import App from './App.jsx'
import { authClient } from './lib/auth'

export function AuthLink({ href, className, children }) {
  return (
    <Link className={className} to={href}>
      {children}
    </Link>
  )
}

export function AppWithAuth() {
  const navigate = useNavigate()

  return (
    <NeonAuthUIProvider
      emailOTP
      authClient={authClient}
      Link={AuthLink}
      navigate={navigate}
      replace={(href) => navigate(href, { replace: true })}
      redirectTo="/"
    >
      <App />
    </NeonAuthUIProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppWithAuth />
    </BrowserRouter>
  </StrictMode>,
)
