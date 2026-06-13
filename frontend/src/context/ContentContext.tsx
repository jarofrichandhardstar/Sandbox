import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { contentApi } from '../api/content'
import type { ContentMap } from '../types'

interface ContentContextValue {
  content: ContentMap
  isLoading: boolean
  /** Returns the value for `key`, or `fallback` when the key is missing/empty */
  get: (key: string, fallback?: string) => string
  /** True when the boolean content key is the string "true" */
  flag: (key: string) => boolean
  /** Reload content (call after admin saves) */
  refresh: () => Promise<void>
}

const ContentContext = createContext<ContentContextValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ContentMap>({})
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    try {
      const res = await contentApi.list()
      const map: ContentMap = {}
      for (const item of res.data ?? []) {
        map[item.key] = item.value
      }
      setContent(map)
    } catch {
      // non-fatal — use fallbacks
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const get = (key: string, fallback = '') => content[key] ?? fallback
  const flag = (key: string) => content[key] === 'true'

  return (
    <ContentContext.Provider value={{ content, isLoading, get, flag, refresh: load }}>
      {children}
    </ContentContext.Provider>
  )
}

export function useContent() {
  const ctx = useContext(ContentContext)
  if (!ctx) throw new Error('useContent must be used within ContentProvider')
  return ctx
}
