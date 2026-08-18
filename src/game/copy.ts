/**
 * All player-facing flavour text.
 * Tone: dry, a little grim, quietly funny. Never baby-talk, never cutesy.
 */

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

const IDLE = [
  'The Warden stares at the door. The door does not blink.',
  'He is counting the stones again. He always gets a different number.',
  'Forty years of watch duty and nobody sends a letter.',
  'He sharpens what is already sharp. It calms him.',
  'Something moved in the west tunnel. Probably nothing. Probably.',
  'He remembers a name he would rather not.',
  'The torches hold. That is most of the job.',
  'He hums a marching song. The march ended long ago.',
  'Dust settles on the old man like it is filing a claim.',
  'He says the hall is not haunted. He says it too often.',
] as const

const GREET_SHORT = [
  'You again. Good.',
  'Back already. Nothing broke.',
  'The hall stands. Barely.',
] as const

const GREET_LONG = [
  'You were gone a while. The stew learned to walk.',
  'Long absence. The Warden has been rehearsing a speech about it.',
  'He counted every hour you were away. Out loud. To a rat.',
  'You left. Time did not. Look at him.',
] as const

const PET = [
  'He grunts. In his language that is affection.',
  'A pat on the pauldron. He pretends not to need it.',
  'The blades flare blue. Show-off.',
  'He almost smiles. The beard hides the evidence.',
  '"Once more and I will requisition a fee."',
  'Sparks. He blames the armour.',
  'He leans into it, then denies leaning.',
] as const

const PET_ANNOYED = [
  'Enough hands. He is an ancient warrior, not a hound.',
  'He steps aside. The moment has passed.',
  '"You have made your point. Twice."',
] as const

const EAT = [
  'He eats standing up, like a man expecting bad news.',
  'Cleared the bowl. Did not thank the bowl.',
  'Chewing. Grim, methodical chewing.',
  '"It is warm. That is the review."',
  'He finishes and looks around for more. There is no more.',
] as const

const FULL = [
  'He is full. Pushing more at him is just cruelty with extra steps.',
  '"One more bite and you carry me."',
] as const

const SLEEP = [
  'He sleeps on straw by choice. He calls a bed "soft thinking".',
  'Snoring like a portcullis. The dust obeys.',
  'Out cold in nine seconds. Old soldier trick.',
  'He dreams of a quiet posting. He has one. He still dreams of it.',
] as const

const WASH = [
  'Forty years of rust, negotiated down to thirty-nine.',
  'The water goes in clear and comes out with opinions.',
  'He scrubs the gold trim first. Priorities.',
  '"I was clean in spring." It is autumn.',
] as const

const PLAY = [
  'He juggles the blades. He has all his fingers. Mostly.',
  'Bone dice on a stone floor. He wins. He is alone.',
  'A short dance. He will deny the dance.',
  'He laughs once, then checks that nobody heard.',
] as const

const TRAIN = [
  'The dummy has no complaints. The dummy has no head, either.',
  'Straw everywhere. Technique intact.',
  '"Still faster than you." Unclear who he means.',
  'He drills the same cut nine times. It gets worse, then perfect.',
] as const

const TIRED = [
  'He is running on stubbornness and bad broth.',
  'His eyes keep closing without asking him.',
] as const

const DIRTY = [
  'Something is growing on the greaves. It has a colour.',
  'He is one rainstorm away from becoming terrain.',
] as const

const SAD = [
  'He has gone quiet. The bad kind of quiet.',
  'He faces the wall. The wall is winning.',
] as const

const LOW_SPIRIT = [
  'The blue light gutters. He pretends not to notice.',
  'His swords have stopped humming. He calls it "resting".',
] as const

const BROKE = [
  'Not enough marks. The Warden checks his boot. Nothing.',
  'You are poor. He has been poor longer, and better at it.',
] as const

const NO_SHARDS = [
  'Shards are shards. You have none. Go hit the dummy.',
  'The blue kind of money. You are out.',
] as const

const BUY = [
  'Bought. He inspects it like a suspicious parcel.',
  'Coin changes hands. Nothing explodes.',
  'Added to the larder. It will not last.',
] as const

const EQUIP = [
  'He turns once, checking the fit. Approves silently.',
  '"Fine. It will do for the dark."',
  'He adjusts it twice, then leaves it exactly as it was.',
] as const

const TRAIN_RESULT_GOOD = [
  'The dummy will need a priest.',
  'Clean work. Straw for days.',
  'He is breathing hard and enjoying it.',
] as const

const TRAIN_RESULT_BAD = [
  'That was not training. That was stretching.',
  'The dummy is unharmed and slightly smug.',
] as const

const COOLDOWN = [
  'Give him a moment. He is old, not instant.',
  'Not yet. He is still recovering from the last idea.',
] as const

const PROP_DOOR = [
  'The lower gate. It stays shut. That was the arrangement.',
  'Something on the far side shifts its weight. He pretends not to hear.',
  '"Not tonight," he says, to nobody in particular.',
] as const

const PROP_TORCH = [
  'The flame leans away from the door. It always does.',
  'He keeps them fed. Fire is cheaper than courage.',
] as const

const PROP_CAULDRON = [
  'Something grey is thinking about becoming stew.',
  'The pot has been on since a war he does not discuss.',
] as const

const PROP_BED = [
  'Straw, a rolled blanket, forty years of habit.',
  'He calls it a bed. It calls itself a pile.',
] as const

export const COPY = {
  idle: () => pick(IDLE),
  greetShort: () => pick(GREET_SHORT),
  greetLong: () => pick(GREET_LONG),
  pet: () => pick(PET),
  petAnnoyed: () => pick(PET_ANNOYED),
  eat: () => pick(EAT),
  full: () => pick(FULL),
  sleep: () => pick(SLEEP),
  wash: () => pick(WASH),
  play: () => pick(PLAY),
  train: () => pick(TRAIN),
  tired: () => pick(TIRED),
  dirty: () => pick(DIRTY),
  sad: () => pick(SAD),
  lowSpirit: () => pick(LOW_SPIRIT),
  broke: () => pick(BROKE),
  noShards: () => pick(NO_SHARDS),
  buy: () => pick(BUY),
  equip: () => pick(EQUIP),
  trainGood: () => pick(TRAIN_RESULT_GOOD),
  trainBad: () => pick(TRAIN_RESULT_BAD),
  cooldown: () => pick(COOLDOWN),
  door: () => pick(PROP_DOOR),
  torch: () => pick(PROP_TORCH),
  cauldron: () => pick(PROP_CAULDRON),
  bed: () => pick(PROP_BED),
}

/** Boot screen lore lines. */
export const BOOT_LINES = [
  'Someone has to hold the lower gate.',
  'The pay is bad. The company is worse.',
  'He was a hero. Now he is a caretaker with two swords.',
] as const

export function bootLine(): string {
  return pick(BOOT_LINES)
}
