import { MotionConfig } from 'motion/react'
import { Route, Routes } from 'react-router'

import { Layout } from './components/Layout'
import { useApplySettings } from './lib/settings'
import { Bookmarks } from './pages/Bookmarks'
import { Chapter } from './pages/Chapter'
import { Chapters } from './pages/Chapters'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { Notes } from './pages/Notes'
import { Search } from './pages/Search'
import { SignIn } from './pages/SignIn'
import { Situation } from './pages/Situation'
import { Situations } from './pages/Situations'
import { Verse } from './pages/Verse'

export function App() {
  useApplySettings()
  return (
    // Respects the device's "reduce motion" setting for every animation.
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="chapters" element={<Chapters />} />
          <Route path="chapter/:chapter" element={<Chapter />} />
          <Route path="verse/:chapter/:verse" element={<Verse />} />
          <Route path="guidance" element={<Situations />} />
          <Route path="guidance/:slug" element={<Situation />} />
          <Route path="search" element={<Search />} />
          <Route path="bookmarks" element={<Bookmarks />} />
          <Route path="notes" element={<Notes />} />
          <Route path="signin" element={<SignIn />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </MotionConfig>
  )
}
