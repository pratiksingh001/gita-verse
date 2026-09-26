import { useEffect, useRef } from 'react'

// The parts of Google Identity Services (https://accounts.google.com/gsi/client) used here.
interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void
      renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

let scriptPromise: Promise<GoogleIdentity> | undefined

function loadGoogle(): Promise<GoogleIdentity> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google sign-in unavailable')))
    script.onerror = () => {
      scriptPromise = undefined // allow a retry on the next render
      reject(new Error('Could not load Google sign-in'))
    }
    document.head.append(script)
  })
  return scriptPromise
}

/** Google's own "Continue with Google" button. The credential goes to our API for verification. */
export function GoogleButton({ clientId, onCredential }: { clientId: string; onCredential: (credential: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  // Google keeps the first callback it's given, so route it through a ref to the latest one.
  const callback = useRef(onCredential)
  useEffect(() => {
    callback.current = onCredential
  }, [onCredential])

  useEffect(() => {
    let cancelled = false
    loadGoogle()
      .then((google) => {
        if (cancelled || !ref.current) return
        google.accounts.id.initialize({ client_id: clientId, callback: (r) => callback.current(r.credential) })
        google.accounts.id.renderButton(ref.current, {
          theme: document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 320,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [clientId])

  return <div ref={ref} className="flex min-h-11 justify-center" />
}
