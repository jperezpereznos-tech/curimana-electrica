'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function StaggerContainer({
  children,
  className,
  delay = 0,
  stagger = 60,
}: {
  children: ReactNode
  className?: string
  delay?: number
  stagger?: number
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className={cn('space-y-0', className)}>
      {Array.isArray(children) ? (
        children.map((child, i) => (
          <div
            key={i}
            className={cn(
              'transition-all duration-500 ease-out',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
            style={{ transitionDelay: mounted ? `${i * stagger}ms` : '0ms' }}
          >
            {child}
          </div>
        ))
      ) : (
        <div
          className={cn(
            'transition-all duration-500 ease-out',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        className
      )}
    >
      {children}
    </div>
  )
}
