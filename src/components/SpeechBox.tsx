export interface SpeechBoxProps {
  text: string
  /** bump to replay the entry animation */
  animKey?: number
  className?: string
}

/**
 * The warden's line. A carved plaque under the room, not a rounded chat
 * bubble — the tone is a dungeon sign, not a messaging app.
 */
export function SpeechBox({ text, animKey = 0, className }: SpeechBoxProps) {
  return (
    <div className={`speech ${className ?? ''}`}>
      <span className="speech__nib" />
      <p key={animKey} className="speech__text anim-slide-up">
        {text}
      </p>
    </div>
  )
}
