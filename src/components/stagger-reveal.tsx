'use client'

import { useSyncExternalStore, type ReactNode } from 'react'

const emptySubscribe = () => () => {}

export function StaggerReveal({ children }: { children: ReactNode }) {
  const visible = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

  return (
    <div className="flex flex-col gap-8">
      {Array.isArray(children) ? (
        children.map((child, i) => (
          <div
            key={i}
            className="animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out fill-mode-both"
            style={{ animationDelay: visible ? `${i * 80}ms` : '0ms' }}
          >
            {child}
          </div>
        ))
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out fill-mode-both">
          {children}
        </div>
      )}
    </div>
  )
}
