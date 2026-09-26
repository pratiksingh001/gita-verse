import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource-variable/source-serif-4'
import '@fontsource-variable/source-serif-4/wght-italic.css'
import '@fontsource-variable/inter'
import '@fontsource/tiro-devanagari-sanskrit'
import '@fontsource-variable/noto-serif-devanagari'
import './index.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import { App } from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The Gita text never changes: once loaded, keep it for the whole session.
      staleTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
