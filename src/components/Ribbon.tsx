import type { ReactNode } from 'react'

export interface RibbonProps {
  children: ReactNode
  /** 'gold' for titles, 'blood' for headings, 'dark' for subtitles */
  tone?: 'gold' | 'blood' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Fantasy title ribbon with stepped, pixel-cut ends. Used for screen titles
 * instead of plain headings.
 */
export function Ribbon({ children, tone = 'gold', size = 'md', className }: RibbonProps) {
  return (
    <div className={`ribbon ribbon--${tone} ribbon--${size} ${className ?? ''}`}>
      <span className="ribbon__tail ribbon__tail--l" />
      <span className="ribbon__body t-title">{children}</span>
      <span className="ribbon__tail ribbon__tail--r" />
    </div>
  )
}
