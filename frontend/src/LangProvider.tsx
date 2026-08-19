import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  LangContext,
  STORAGE_KEY,
  detectLang,
  formatBytes,
  plural,
  relativeTime,
  translate,
  translateBackend,
  type Lang,
  type Translator,
} from './i18n'

/** The browser's language, unless someone has said otherwise. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)

  // A detected language is as real as a chosen one: without this the document
  // stays `lang="en"` from index.html and a screen reader voices Russian as
  // English.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // A browser refusing storage should still switch language for this visit.
    }
  }, [])

  const value = useMemo<Translator>(
    () => ({
      lang,
      t: (key, vars) => translate(lang, key, vars),
      tb: (key, vars, fallback) => translateBackend(lang, key, vars, fallback),
      n: (count, noun) => plural(lang, count, noun),
      ago: (seconds) => relativeTime(lang, seconds),
      bytes: (value) => formatBytes(lang, value),
      setLang,
    }),
    [lang, setLang],
  )

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}
