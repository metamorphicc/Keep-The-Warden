# Keep The Warden

A pixel-art care/idle game built as a **Telegram Mini App**. You look after an
old dual-sword warden who guards a door nobody opens any more. Feed him, let him
sleep, scrub his armour, play dice, send him at the training dummy, and tap him
when he is sulking.

Original world, original character, original item names. No combat, no
blockchain, no NFTs, no wallet login. React + TypeScript + Vite, one HTML file,
a handful of procedurally drawn `<canvas>` scenes, `localStorage`, and one
zero-dependency serverless function for the bot's `/start` message.

Every player gets their own warden: the save is namespaced by Telegram account
id and mirrored into Telegram's `CloudStorage`, so progress follows the player to
another device without a backend. He can be renamed, and the **Service Record**
screen shows his name, condition, regalia and lifetime tally.

---

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Open the printed `http://localhost:5173`. The dev server binds to `0.0.0.0`
(`server.host: true`) so a phone on the same Wi-Fi can reach it at
`http://<your-lan-ip>:5173`.

Other scripts:

```bash
npm run typecheck
```

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm run banner
```

`build` runs `tsc --noEmit` first, then Vite. Output lands in `dist/` with
`base: './'`, so the folder can be dropped on any static host — including a
subpath behind nginx, GitHub Pages, Netlify or Vercel — without extra config.
`banner` regenerates `public/start-banner.png` (see
[Replacing the /start picture](#replacing-the-start-picture)).

**Requirements:** Node 18+ (Node 20+ recommended for Vite 6).

---

## Playing it in a browser

The game runs fine outside Telegram: `telegram-web-app.js` is loaded from
`index.html`, and everything that touches the Telegram SDK is behind a guard in
[src/telegram/telegram.ts](src/telegram/telegram.ts). Outside Telegram you lose
haptics, the native back button and the theme handshake — nothing else.

Useful during development:

- Progress lives in `localStorage` under `ktw.save.v1:<telegram-user-id>`, or
  `ktw.save.v1:guest` in a plain browser. Clear that key (or use **The Keep →
  Abandon the post**) for a fresh install.
- Telegram `CloudStorage` is only available inside Telegram 6.9+, so in a browser
  the save is local-only. **Service Record → Keeper** says which of the two you
  are looking at.
- Needs decay from wall-clock time, so closing the tab for an hour has a real
  effect. Offline decay is capped at 36 hours (`MAX_OFFLINE_HOURS`).
- **The Keep → Still Hall** freezes fire, dust and screen shake, which makes
  screenshots and reduced-motion testing easier.

---

## Deploying to Vercel

The game itself is a static bundle. The only server-side code is
[api/telegram.ts](api/telegram.ts) — the bot's webhook, one file, no
dependencies — which Vercel picks up automatically from the `api/` folder
alongside the Vite build. [vercel.json](vercel.json) pins the rest so the
dashboard has nothing to guess:

- `framework: "vite"`, `buildCommand: "npm run build"`, `outputDirectory: "dist"`
- hashed files under `/assets/` get a one-year `immutable` cache
- `index.html` is `max-age=0, must-revalidate`, so a new deploy actually reaches
  players instead of sitting behind a stale WebView cache

**From the dashboard (recommended — every push to `main` redeploys):**

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → this repo.
2. Leave every field alone. The framework preset, build command and output
   directory all come from `vercel.json`.
3. **Deploy.** You get `https://<project>.vercel.app`.

**From the CLI, if you would rather not connect Git:**

```bash
npx vercel --prod
```

First run asks you to log in and links the folder to a project; after that the
same command redeploys. It uploads the working directory, so commit or stash
anything you do not want shipped.

Notes that matter for Telegram specifically:

- **No `X-Frame-Options`.** Telegram Desktop and Web embed the Mini App in an
  iframe; sending that header (or a strict `frame-ancestors`) shows players a
  blank rectangle. `vercel.json` deliberately sets neither.
- **Deployment Protection.** If you enable Vercel Authentication for
  *production*, Telegram's WebView hits an SSO wall it cannot pass. Preview-only
  protection (the default) is fine.
- Nothing in the game is secret — the save file lives in the player's own
  `localStorage` and in their Telegram `CloudStorage`. The **bot** does need
  secrets; they go in Vercel's environment variables, never in the repo. See the
  next section.

---

## The bot: `/start`, the picture, the button

[api/telegram.ts](api/telegram.ts) is the webhook. On `/start`, `/help` or
`/play` it replies with a banner image, a short description of the game, and one
inline button that opens the Mini App. Anything else gets a one-line nudge. It is
plain TypeScript against `fetch` — no `node-telegram-bot-api`, no `grammy`,
nothing to install.

### 1. Environment variables

Vercel → your project → **Settings → Environment Variables**. Add these to
**Production** (and Preview, if you test there):

| Name | Required | What it is |
| --- | --- | --- |
| `BOT_TOKEN` | yes | The token BotFather gave you. Never commit it. |
| `WEBHOOK_SECRET` | recommended | Any random string. Telegram echoes it back in the `X-Telegram-Bot-Api-Secret-Token` header; requests without it are rejected with 401. |
| `APP_URL` | no | Public HTTPS origin of the Mini App, e.g. `https://keep-the-warden.vercel.app`. Falls back to Vercel's own `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`. |
| `START_IMAGE_URL` | no | Absolute URL of the `/start` picture. Defaults to `<APP_URL>/start-banner.png`. |

Redeploy after adding them — Vercel only injects env vars at build/boot time.

### 2. Point Telegram at the webhook

Once deployed, register the URL once (replace the token, the host and the
secret):

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<your-project>.vercel.app/api/telegram&secret_token=<WEBHOOK_SECRET>"
```

Check it any time:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

Opening `https://<your-project>.vercel.app/api/telegram` in a browser is a GET,
so it answers with a small JSON health check (`configured: true` once `BOT_TOKEN`
is set) instead of doing anything.

Two things worth knowing:

- The handler always answers `200`, even on its own errors. Telegram retries
  non-2xx replies for hours, which turns one bad update into a flood.
- The `web_app` inline button only works in **private chats**, and only when
  `APP_URL` resolves to `https://`. If it cannot, the message still goes out —
  just without the button.

### 3. Replacing the /start picture

The shipped banner is [public/start-banner.png](public/start-banner.png) —
640×360, drawn by [tools/make-banner.mjs](tools/make-banner.mjs) from the game's
own renderer, so it cannot drift from the sprite on screen. Three ways to change
it, in order of least effort:

1. **Drop in your own file.** Overwrite `public/start-banner.png` (keep 640×360
   or any 16:9 image up to 10 MB) and redeploy. Nothing else to change — the
   default `START_IMAGE_URL` points at that path.
2. **Host it anywhere.** Set `START_IMAGE_URL` to any public HTTPS image URL.
   Telegram fetches it directly.
3. **Regenerate it.** Edit [tools/make-banner.mjs](tools/make-banner.mjs) — the
   output size is `W`/`H`/`SCALE` at the top, and the composition (the warden's
   equipped look, the `TITLE` plaque and the `SUB` corner label) is the last
   forty lines — then:

   ```bash
   npm run banner
   ```

The caption lives in the `CAPTION` constant at the top of
[api/telegram.ts](api/telegram.ts) (Telegram HTML: `<b>`, `<i>`, `<a>`), and the
button label in `BUTTON_TEXT` just below it.

---

## Attaching it to a bot in BotFather

Telegram will only load a Mini App over **HTTPS**. Production is the Vercel URL
above. For local development against the real client, tunnel the dev server:

```bash
npx cloudflared tunnel --url http://localhost:5173
```

(`ngrok http 5173` or `npx localtunnel --port 5173` work too. `allowedHosts:
true` in [vite.config.ts](vite.config.ts) means Vite accepts whatever hostname
the tunnel hands you.)

Then, in Telegram:

1. Open [@BotFather](https://t.me/BotFather) and send `/newbot`. Pick a display
   name and a username ending in `bot`. Keep the token it gives you private.
2. Send `/newapp` and choose your bot. BotFather asks for:
   - **Title** — `Keep The Warden`
   - **Short description** — `Mind the old man in the hall.`
   - **Photo** — 640×360
   - **Demo GIF** — optional, send `/empty` to skip
   - **Web App URL** — your HTTPS URL (the tunnel URL while developing, your
     static host in production)
   - **Short name** — e.g. `warden`; this becomes
     `https://t.me/<yourbot>/warden`
3. Open that `t.me` link, or `/setmenubutton` → your bot → **Edit menu button
   URL** to put the game behind the chat's menu button.

To go live, point the Web App URL at your Vercel deployment — `/setmenubutton`
and the `/newapp` URL can both be edited later from BotFather (`/myapps` → the
app → **Edit Web App URL**).

### What the app asks of Telegram

All of it is in [src/telegram/telegram.ts](src/telegram/telegram.ts):

- `ready()` and `expand()` on boot
- header / background / bottom-bar colours matched to the game's palette
- `disableVerticalSwipes()` on clients that support it, so tapping the warden
  never drags the sheet closed
- `BackButton` wired to the in-game back navigation
- `HapticFeedback` on every action (respects the **Rumble** setting)
- `viewportStableHeight` and the safe-area insets, republished as the
  `--app-h`, `--sa-top`, `--sa-bottom` CSS variables

Every one of those is feature-detected; older clients simply skip them.

---

## Folder structure

```
.
├── index.html                 # viewport-fit=cover, theme colour, Telegram bridge, pixel fonts
├── vite.config.ts             # base './', LAN host, allowedHosts for tunnels
├── vercel.json                # static deploy: vite preset, asset caching, no frame blocking
├── tsconfig.json              # strict, noUnusedLocals/Parameters; covers src, api and vite.config
├── api
│   └── telegram.ts            # the bot webhook: /start photo + caption + Mini App button
├── tools
│   └── make-banner.mjs        # renders public/start-banner.png using the game's own art code
├── public
│   └── start-banner.png       # 640×360 image the bot sends with /start — replace freely
└── src
    ├── main.tsx               # mount + stylesheet imports
    ├── App.tsx                # Telegram handshake, cloud pull, 1s game clock, screen router
    ├── game
    │   ├── types.ts           # Needs, SaveData, GameState, item defs
    │   ├── config.ts          # WORLD names, save keys, name sanitiser, decay, actions, foods, regalia
    │   ├── store.ts           # useSyncExternalStore store + tick() decay clock
    │   ├── persistence.ts     # per-account localStorage + CloudStorage mirror, migration, offline decay
    │   ├── actions.ts         # every player verb: feed, sleep, wash, play, train, pet, buy, equip, rename
    │   ├── copy.ts            # all dry, slightly grim dialogue lines
    │   ├── fx.ts              # tiny pub/sub bus for particle bursts, floating text, shake
    │   ├── sound.ts           # WebAudio blips, synthesised (no audio files)
    │   └── util.ts            # clamp, formatAway, formatSeconds
    ├── render                 # everything canvas, no DOM
    │   ├── draw.ts            # pixel primitives: px, pxa, outline, pxLine, dither, lightPool, noise2
    │   ├── room.ts            # the Deep Hall: walls, door, banners, hearth, straw bed, grime
    │   ├── warden.ts          # the character sprite, poses and equipped-look variants
    │   ├── particles.ts       # pooled particle system (sparks, embers, suds, crumbs, Z's, coins)
    │   └── dummy.ts           # the training pit and its battered dummy
    ├── components             # reusable pixel UI
    │   ├── PixelPanel.tsx     # wooden/stone framed panel with rivets and a title ribbon
    │   ├── PixelBar.tsx       # RPG stat bar, quantised to 5% steps
    │   ├── PixelButton.tsx    # chunky bevelled button with icon + sublabel
    │   ├── ItemSlot.tsx       # inventory slot: owned / locked-with-chains / selected
    │   ├── PixelIcon.tsx      # the whole icon set, drawn as CSS box-shadow pixel matrices
    │   ├── WardenPlinth.tsx   # the live sprite in a candle-lit alcove (regalia + service record)
    │   ├── Ribbon.tsx, ScreenHeader.tsx, CurrencyBar.tsx, SpeechBox.tsx,
    │   ├── Modal.tsx, FloatingTextLayer.tsx
    │   └── RoomCanvas.tsx     # the main-room stage: one canvas, one rAF loop, hotspot taps
    ├── screens                # the eight screens
    │   ├── BootScreen.tsx     # title, portrait, audio-unlock gesture
    │   ├── RoomScreen.tsx     # the main loop: stage + need bars + action bar
    │   ├── FeedScreen.tsx     # larder
    │   ├── WardrobeScreen.tsx # regalia, with a live preview
    │   ├── TrainScreen.tsx    # tap-the-dummy mini-game
    │   ├── ShopScreen.tsx     # provisions + regalia
    │   ├── ProfileScreen.tsx  # service record: name + rename, condition, keeper, regalia, tally
    │   └── SettingsScreen.tsx # comforts, save, wipe save
    ├── telegram
    │   └── telegram.ts        # the entire Telegram surface, feature-detected (incl. CloudStorage)
    └── styles
        ├── tokens.css         # colour, spacing and border tokens
        ├── palette.ts         # the same palette for canvas code
        ├── global.css         # reset, pixel fonts, zero border-radius, scanlines
        ├── ui.css             # the reusable components
        └── screens.css        # per-screen layout
```

---

## How it works

**State.** One tiny observable store (`src/game/store.ts`) built on
`useSyncExternalStore` — no Redux, no Zustand, no context. Snapshots are
immutable, so `useGame(selector)` re-renders only when something it reads
changed. The 60fps canvases skip React entirely and call `getState()` once per
frame.

**Time.** `tick()` runs every second and derives decay from the wall-clock delta,
so a backgrounded WebView catches up in one step instead of drifting. Decay
pauses while he is asleep. Cooldowns and activity animations are wall-clock too;
only the training mini-game uses `performance.now()`.

**Saving.** Every player gets their own warden. The `localStorage` key is
namespaced with the Telegram account id — `ktw.save.v1:<id>`, or `:guest` outside
Telegram — and a save left behind by an older build under the un-namespaced key
is adopted once, on first load. Local writes are debounced 500 ms and flushed on
`pagehide` and on `visibilitychange → hidden`. The loader repairs corrupt or
partial saves field by field rather than throwing them away.

The same save is mirrored into Telegram's `CloudStorage` (Bot API 6.9+) on a
lazier 12 s debounce, so it follows the player to another device with no backend
of ours. Cloud writes stay shut until `releaseCloudWrites()` fires after boot —
otherwise the fresh default state would race ahead and overwrite real progress.
On boot, `pullCloudSave()` only adopts the remote copy if it is genuinely newer
(`lastVisit > localSavedAt + 1000`) **and** the player is still on the boot
screen, so a slow network can never yank the ground out from under someone who
has already started playing.

**Art.** No sprite sheets, no image files, no WebGL. Every scene is drawn with
integer `fillRect` calls into a small canvas — the hall is 192×288 — which is
then upscaled by a whole-number factor so every pixel stays a perfect square.
Static geometry is rendered once into an offscreen canvas and blitted per frame;
only fire, light flicker, the character and particles redraw. Light pools and
vignettes are dithered rather than gradients, so nothing looks like CSS.

**Sound.** Short square/triangle blips synthesised with WebAudio. The audio
context is unlocked by the real tap on the boot screen's button, which keeps
mobile autoplay policies happy.

---

## The loop

| Verb | Effect |
| --- | --- |
| **Tap him** | +Mood, +Spirit, a sword flash and spirit sparks. Soft-capped per minute; sometimes shakes a Mark loose. |
| **Feed** | Opens the larder. Each dish moves Hunger and a couple of other needs. |
| **Wash** | +Clean, costs a little Energy. Also clears the grime that creeps into the room. |
| **Sleep** | He shuffles to the straw mat. +Energy, and decay pauses while he is out. |
| **Play** | Dice. +Mood, +3 Marks. |
| **Train** | The pit: 15 seconds of tapping the dummy. Chained taps build a combo; pays Marks and Shards. |

Needs (Hunger, Energy, Mood, Clean, Spirit) decay at 3.5–8 points per hour, so a
day away leaves him grumpy but alive. Marks buy provisions and regalia; Shards
are the slower currency for the good pieces.

---

## Notes

- 390×844 is the design baseline; the layout holds from ~320 px up to a 520 px
  cap, with safe-area insets on notched devices.
- Every tap target is at least 34 px tall. The main action buttons are 58 px,
  dropping to 50/44 px on short viewports (landscape, small phones) — the row
  of four nav buttons never disappears, since it is the only guaranteed way
  into the Market, the Regalia, the Record and the Keep. (The name tag on the
  stage opens the Record too, but it is hidden below 560 px of height.)
- All copy is deliberately dry. If a line sounds like it is being nice to you,
  it is probably a bug.
