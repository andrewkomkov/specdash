import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  LangContext,
  STORAGE_KEY,
  detectLang,
  plural,
  relativeTime,
  translate,
  type Lang,
  type Translator,
} from './i18n'

/** The browser's language, unless someone has said otherwise. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // A browser refusing storage should still switch language for this visit.
    }
    document.documentElement.lang = next
  }, [])

  const value = useMemo<Translator>(
    () => ({
      lang,
      t: (key, vars) => translate(lang, key, vars),
      n: (count, noun) => plural(lang, count, noun),
      ago: (seconds) => relativeTime(lang, seconds),
      setLang,
    }),
    [lang, setLang],
  )

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}
