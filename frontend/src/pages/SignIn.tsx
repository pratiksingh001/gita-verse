import { AnimatePresence, motion } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { GoogleButton } from '../components/GoogleButton'
import { LotusMark } from '../components/Ornament'
import { Segmented } from '../components/Segmented'
import { primaryButtonClass } from '../components/States'
import { useUser } from '../lib/account'
import { useAuthConfig, useGoogleSignIn, useRegister, useSignIn } from '../lib/auth'
import { useDocumentTitle } from '../lib/hooks'
import { ease, rise, stagger } from '../lib/motion'

type Mode = 'signin' | 'register'

export function SignIn() {
  const [mode, setMode] = useState<Mode>('signin')
  useDocumentTitle(mode === 'signin' ? 'Sign in' : 'Create account')
  const { data: user } = useUser()
  const { data: config } = useAuthConfig()
  const signIn = useSignIn()
  const register = useRegister()
  const google = useGoogleSignIn()
  const navigate = useNavigate()
  // Return to the page that sent the reader here.
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (user) return <Navigate to={from} replace />

  const pending = signIn.isPending || register.isPending || google.isPending
  const error = (mode === 'signin' ? signIn.error : register.error) ?? google.error
  const done = () => navigate(from, { replace: true })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'signin') signIn.mutate({ email, password }, { onSuccess: done })
    else register.mutate({ name, email, password }, { onSuccess: done })
  }

  const inputClass =
    'w-full rounded-xl border border-line bg-surface/50 px-4 py-3 text-ink transition-colors placeholder:text-faint focus:border-accent/40 focus:bg-surface focus:outline-none'

  return (
    <motion.div initial="hidden" animate="show" variants={stagger(0.08)} className="mx-auto max-w-sm pt-14 sm:pt-20">
      <motion.div variants={rise} className="text-center">
        <LotusMark className="mx-auto size-8 text-accent" />
        <h1 className="mt-4 font-display text-4xl font-medium tracking-tight">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-3 font-serif text-muted">
          Keep your bookmarks, notes and reading progress on every device.
        </p>
      </motion.div>

      <motion.div variants={rise} className="mt-8 flex justify-center">
        <Segmented<Mode>
          id="auth-mode"
          label="Sign in or create an account"
          value={mode}
          onChange={(m) => {
            setMode(m)
            signIn.reset()
            register.reset()
          }}
          options={[
            { value: 'signin', label: 'Sign in' },
            { value: 'register', label: 'Create account' },
          ]}
        />
      </motion.div>

      <motion.form variants={rise} onSubmit={submit} className="mt-8 space-y-3">
        <AnimatePresence initial={false}>
          {mode === 'register' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="overflow-hidden"
            >
              <input
                required
                autoComplete="name"
                placeholder="Your name"
                aria-label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <input
          required
          type="email"
          autoComplete="email"
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          required
          type="password"
          minLength={mode === 'register' ? 8 : undefined}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          placeholder={mode === 'register' ? 'Password (at least 8 characters)' : 'Password'}
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />

        <AnimatePresence>
          {error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl bg-accent-soft/60 px-4 py-2.5 text-sm text-ink"
            >
              {error.message}
            </motion.p>
          )}
        </AnimatePresence>

        <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full justify-center disabled:opacity-60`}>
          {pending ? 'Just a moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </motion.form>

      {config?.google_client_id && (
        <motion.div variants={rise} className="mt-8">
          <div className="mb-5 flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <GoogleButton
            clientId={config.google_client_id}
            onCredential={(credential) => google.mutate({ credential }, { onSuccess: done })}
          />
        </motion.div>
      )}
    </motion.div>
  )
}
