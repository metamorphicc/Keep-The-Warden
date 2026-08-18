import type { ReactNode } from 'react'
import { PixelPanel } from './PixelPanel'
import { PixelButton } from './PixelButton'

export interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onCancel: () => void
  danger?: boolean
}

/** Blocking carved dialog. Used for destructive confirmations. */
export function Modal({
  open,
  title,
  children,
  confirmLabel = 'Do it',
  cancelLabel = 'Back off',
  onConfirm,
  onCancel,
  danger = false,
}: ModalProps) {
  if (!open) return null
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal__scrim" onClick={onCancel} />
      <PixelPanel variant="darkwood" title={title} rivets className="modal__panel anim-pop">
        <div className="modal__body t-body">{children}</div>
        <div className="modal__actions">
          <PixelButton label={cancelLabel} variant="ghost" onClick={onCancel} full />
          {onConfirm && (
            <PixelButton
              label={confirmLabel}
              variant={danger ? 'danger' : 'gold'}
              onClick={onConfirm}
              full
            />
          )}
        </div>
      </PixelPanel>
    </div>
  )
}
