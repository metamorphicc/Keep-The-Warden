import { FloatingTextLayer } from '../components/FloatingTextLayer'
import { PixelButton } from '../components/PixelButton'
import { PixelIcon } from '../components/PixelIcon'
import { PixelPanel } from '../components/PixelPanel'
import { ScreenHeader } from '../components/ScreenHeader'
import { boardQuotes, cooldownLeft, doScan, isStale, openBet } from '../game/actions'
import { MARKET, MARKET_BY_ID, WORLD } from '../game/config'
import { useGameState } from '../game/store'
import { formatPrice, formatProb, formatSeconds } from '../game/util'

/* ==========================================================================
   The board — six invented questions with locally generated quotes.

   Nothing here is fetched. There is no feed, no API key and no network call in
   the whole screen; a scan just re-rolls the numbers and charges him for the
   time it took to read them.
   ========================================================================== */

export function ScanScreen() {
  const s = useGameState()
  const now = Date.now()
  const board = boardQuotes()
  const left = cooldownLeft('scan', now)
  const broke = s.stats.focus < MARKET.focusCost

  return (
    <div className="screen">
      <ScreenHeader title="The Board" />

      <div className="screen__body">
        <FloatingTextLayer />

        <PixelPanel variant="darkwood" pad="sm" rivets>
          <ul className="board">
            {board.map((q) => {
              const def = MARKET_BY_ID[q.id]!
              const stale = isStale(q.quotedAt, now)
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    className={`mkt ${stale ? 'is-stale' : ''}`}
                    onClick={() => openBet(q.id)}
                  >
                    <span className="mkt__icon">
                      <PixelIcon name={def.icon} size={20} />
                    </span>

                    <span className="mkt__mid">
                      <span className="mkt__tag t-label t-dim">
                        {def.tag}
                        {stale ? ' · stale' : ''}
                      </span>
                      <span className="mkt__q t-body">{def.question}</span>
                      <span className="mkt__cost t-label t-dim">
                        {def.focusCost} focus · {def.heatCost} heat
                      </span>
                    </span>

                    <span className="mkt__quote">
                      <b className="mkt__prob">{formatProb(q.prob)}</b>
                      <span className="t-label t-dim">
                        Y {formatPrice(q.prob)} / N {formatPrice(1 - q.prob)}
                      </span>
                      {/* one chunky segment bar instead of a chart */}
                      <span className="mkt__bar" aria-hidden="true">
                        <i style={{ width: `${Math.round(q.prob * 20) * 5}%` }} />
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </PixelPanel>

        <PixelButton
          label={left > 0 ? 'Board is settling' : broke ? 'Too fried to read it' : 'Scan the board'}
          icon="dice"
          variant="teal"
          size="lg"
          full
          disabled={left > 0}
          sublabel={
            left > 0
              ? formatSeconds(left)
              : `Costs ${MARKET.focusCost} focus · +${MARKET.heatCost} heat`
          }
          onClick={() => doScan()}
        />

        <p className="t-label t-dim t-center screen__foot">
          Quotes go stale after {Math.round(MARKET.quoteTtlMs / 60_000)} minutes and fill worse.
          <br />
          {WORLD.disclaimer}
        </p>
      </div>
    </div>
  )
}
