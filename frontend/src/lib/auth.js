import { createAuthClient } from '@neondatabase/neon-js/auth'
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters'

const authUrl = import.meta.env.VITE_NEON_AUTH_URL
export const PENDING_EMAIL_VERIFICATION_KEY = 'strategium-forge:pending-email-verification'
export const PENDING_EMAIL_VERIFICATION_EVENT = 'strategium-forge:pending-email-verification'

if (!authUrl) {
  throw new Error(
    'Missing VITE_NEON_AUTH_URL. Add it to the project root .env.local from Neon Console -> Auth -> Configuration.',
  )
}

function emitPendingEmailVerification(email) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(PENDING_EMAIL_VERIFICATION_EVENT, { detail: { email } }))
}

export function getPendingEmailVerification() {
  if (typeof window === 'undefined') {
    return null
  }

  const email = window.sessionStorage.getItem(PENDING_EMAIL_VERIFICATION_KEY)
  return email ? { email } : null
}

export function clearPendingEmailVerification() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(PENDING_EMAIL_VERIFICATION_KEY)
  emitPendingEmailVerification(null)
}

export function setPendingEmailVerification(email) {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedEmail = String(email || '').trim()
  if (!normalizedEmail) {
    clearPendingEmailVerification()
    return
  }

  window.sessionStorage.setItem(PENDING_EMAIL_VERIFICATION_KEY, normalizedEmail)
  emitPendingEmailVerification(normalizedEmail)
}

export function getUserThemePreference(user) {
  if (!user || typeof user !== 'object') {
    return null
  }

  const directTheme = typeof user.themePreference === 'string' ? user.themePreference.trim() : ''
  if (directTheme) {
    return directTheme
  }

  const metadataTheme = typeof user.metadata?.themePreference === 'string'
    ? user.metadata.themePreference.trim()
    : ''
  if (metadataTheme) {
    return metadataTheme
  }

  const userMetadataTheme = typeof user.user_metadata?.themePreference === 'string'
    ? user.user_metadata.themePreference.trim()
    : ''
  if (userMetadataTheme) {
    return userMetadataTheme
  }

  return null
}

export async function persistUserThemePreference(themeId) {
  const payloadAttempts = [
    { themePreference: themeId },
    { metadata: { themePreference: themeId } },
  ]

  let lastError = null
  for (const payload of payloadAttempts) {
    try {
      const result = await authClient.updateUser(payload)
      if (!result?.error) {
        return result
      }
      lastError = result.error
    } catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new Error('Unable to save theme preference.')
}

export const authClient = createAuthClient(authUrl, {
  adapter: BetterAuthReactAdapter(),
})
const originalSignUpEmail = authClient.signUp.email.bind(authClient.signUp)

authClient.signUp.email = async (params) => {
  const result = await originalSignUpEmail(params)
  const email = String(params?.email || '').trim()

  if ('token' in result && result.token) {
    clearPendingEmailVerification()
  } else if (email) {
    setPendingEmailVerification(email)
  }

  return result
}
