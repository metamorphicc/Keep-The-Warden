/**
 * All player-facing flavour text.
 * Tone: dry, a little grim, quietly funny. Trading-floor gallows humour, never
 * hype, never a rocket emoji. Nothing here promises anybody any money.
 */

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

const IDLE = [
  'The book is noisy. Find an edge or get chopped.',
  'He watches a quote breathe. It is lying about something.',
  'Forty years of screens and nobody sends a letter.',
  'He re-reads the resolution rules. They have not improved.',
  'Somebody big moved in the ETF question. Probably nothing.',
  'He remembers a fill he would rather not.',
  'The terminal hums. That is most of the job.',
  'He mutters a number, then halves it. Old habit.',
  'Dust settles on the old man like it is marking him to market.',
  'He says he is flat. He says it too often.',
] as const

const GREET_SHORT = [
  'You again. Good.',
  'Back already. Nothing resolved.',
  'The account survives. Barely.',
] as const

const GREET_LONG = [
  'You were gone a while. The board re-priced without you.',
  'Long absence. He has been rehearsing a speech about discipline.',
  'He counted every hour you were away. Out loud. To the terminal.',
  'You left. The clock did not. Look at him.',
] as const

const PNL = [
  'He turns the book toward you. Grunts. That is the summary.',
  'A tap on the ledger. He pretends not to need the audience.',
  'The screen flares green for a second. Show-off.',
  'He almost smiles. The beard hides the evidence.',
  '"Check it again and I will start charging you for the look."',
  'Numbers scroll. He reads them like weather.',
  'He leans into the review, then denies leaning.',
] as const

const PNL_ANNOYED = [
  'Enough. Staring at the PnL is not a strategy.',
  'He closes the book. The moment has passed.',
  '"You have made your point. Twice."',
] as const

const RESEARCH = [
  'He reads standing up, like a man expecting bad news.',
  'Notes filed. Did not thank the notes.',
  'Reading. Grim, methodical reading.',
  '"It has a base rate. That is the review."',
  'He finishes the page and looks for more. There is no more.',
] as const

const SATURATED = [
  'His edge is as good as it gets today. More reading is just avoidance.',
  '"One more page and I forget the first one."',
] as const

const RECOVER = [
  'He sleeps at the desk by choice. He calls a bed "soft thinking".',
  'Out cold in nine seconds. Old trader trick.',
  'Snoring like a printer. The heat bleeds off.',
  'He dreams of a flat book. He has one. He still dreams of it.',
] as const

const HEDGE = [
  'He works the other leg. Ugly, cheap, correct.',
  'The exposure goes in loud and comes out mumbling.',
  'He shaves the position first. Priorities.',
  '"Small and boring beats right and broke."',
] as const

const SCAN = [
  'He walks the board, tapping each question once.',
  'Six questions, four opinions, one number that matters.',
  'Fresh quotes. Same ancient nonsense.',
  'He snorts at one of the prices and moves on.',
] as const

const BET = [
  'Size chosen. He does not look at it twice.',
  'The ticket goes in. Simulated, and still his hands are cold.',
  '"This is the thesis. Do not ask me again in an hour."',
  'He commits, then immediately looks for the exit.',
] as const

const NO_FOCUS = [
  'He is running on stubbornness and burnt coffee.',
  'His eyes keep closing without asking him.',
] as const

const HOT = [
  'Heat is high. Hedge or blow the account.',
  'He is one bad print away from doing something stupid twice.',
] as const

const NO_REP = [
  'Nobody quotes him any more. The desk forgets fast.',
  'He faces the wall. The wall is winning.',
] as const

const NO_EDGE = [
  'No thesis. You are gambling, not trading.',
  'He is guessing in a nice coat. He knows it.',
] as const

const BROKE = [
  'Not enough bankroll. He checks his boot. Nothing.',
  'The account is thin. He has been thin longer, and better at it.',
] as const

const NO_CREDITS = [
  'Credits are credits. You have none. Go win something.',
  'The good kind of money. You are out.',
] as const

const BUY = [
  'Bought. He inspects it like a suspicious parcel.',
  'Cash changes hands. Nothing explodes.',
  'Filed with the notes. It will not last.',
] as const

const EQUIP = [
  'He turns once, checking the fit. Approves silently.',
  '"Fine. It will do for the night session."',
  'He adjusts it twice, then leaves it exactly as it was.',
] as const

const WIN = [
  'It resolves your way. He does not celebrate. He writes it down.',
  'Paid. "Once is luck. Twice is still luck."',
  'Green. He looks almost suspicious of it.',
] as const

const LOSS = [
  'It resolves against you. He exhales through his nose.',
  'Gone. "That was the thesis working exactly as feared."',
  'Red. He closes the book harder than necessary.',
] as const

const SLIP = [
  'Bad fill. That is what heat costs.',
  'The price moved while he hesitated. It always does.',
] as const

const COOLDOWN = [
  'Give him a moment. He is old, not instant.',
  'Not yet. He is still recovering from the last idea.',
] as const

const PROP_DOOR = [
  'The exit. It stays shut while there is size on. That was the arrangement.',
  'Somebody knocks about a settlement. He pretends not to hear.',
  '"Not tonight," he says, to nobody in particular.',
] as const

const PROP_TORCH = [
  'The flame leans away from the terminal. It always does.',
  'He keeps them fed. Fire is cheaper than electricity here.',
] as const

const PROP_TERMINAL = [
  'Green text on black. Six questions and no answers.',
  'The old terminal has been on since a drawdown he does not discuss.',
] as const

const PROP_URN = [
  'Coffee, technically. The sediment has strata now.',
  'He drinks it black. Sugar is a position and he is flat.',
  'The pot outlasted two employers and one marriage.',
] as const

const PROP_BED = [
  'A cot, a rolled blanket, forty years of bad hours.',
  'He calls it a bed. It calls itself a pile.',
] as const

export const COPY = {
  idle: () => pick(IDLE),
  greetShort: () => pick(GREET_SHORT),
  greetLong: () => pick(GREET_LONG),
  pnl: () => pick(PNL),
  pnlAnnoyed: () => pick(PNL_ANNOYED),
  research: () => pick(RESEARCH),
  saturated: () => pick(SATURATED),
  recover: () => pick(RECOVER),
  hedge: () => pick(HEDGE),
  scan: () => pick(SCAN),
  bet: () => pick(BET),
  noFocus: () => pick(NO_FOCUS),
  hot: () => pick(HOT),
  noRep: () => pick(NO_REP),
  noEdge: () => pick(NO_EDGE),
  broke: () => pick(BROKE),
  noCredits: () => pick(NO_CREDITS),
  buy: () => pick(BUY),
  equip: () => pick(EQUIP),
  win: () => pick(WIN),
  loss: () => pick(LOSS),
  slip: () => pick(SLIP),
  cooldown: () => pick(COOLDOWN),
  door: () => pick(PROP_DOOR),
  torch: () => pick(PROP_TORCH),
  terminal: () => pick(PROP_TERMINAL),
  urn: () => pick(PROP_URN),
  bed: () => pick(PROP_BED),
}

/** Boot screen lines. */
export const BOOT_LINES = [
  'Somebody has to price the questions nobody can answer.',
  'The money is fake. The burnout is not.',
  'He was a hero once. Now he is a caretaker with two probes.',
] as const

export function bootLine(): string {
  return pick(BOOT_LINES)
}
