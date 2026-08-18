# Keep The Warden

A pixel-art care/idle game built as a **Telegram Mini App**. You look after an
old dual-sword warden who guards a door nobody opens any more. Feed him, let him
sleep, scrub his armour, play dice, send him at the training dummy, and tap him
when he is sulking.

Original world, original character, original item names. No combat, no
blockchain, no NFTs, no wallet login. React + TypeScript + Vite, one HTML file,
a handful of procedurally drawn `<canvas>` scenes, and `localStorage`.

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

`build` runs `tsc --noEmit` first, then Vite. Output lands in `dist/` with
`base: './'`, so the folder can be dropped on any static host — including a
subpath behind nginx, GitHub Pages, Netlify or Vercel — without extra config.

**Requirements:** Node 18+ (Node 20+ recommended for Vite 6).

---

## Playing it in a browser

The game runs fine outside Telegram: `telegram-web-app.js` is loaded from
`index.html`, and everything that touches the Telegram SDK is behind a guard in
[src/telegram/telegram.ts](src/telegram/telegram.ts). Outside Telegram you lose
haptics, the native back button and the theme handshake — nothing else.

Useful during development:

- Progress lives in `localStorage` under `ktw.save.v1`. Clear that key (or use
  **The Keep → Abandon the post**) for a fresh install.
- Needs decay from wall-clock time, so closing the tab for an hour has a real
  effect. Offline decay is capped at 36 hours (`MAX_OFFLINE_HOURS`).
- **The Keep → Still Hall** freezes fire, dust and screen shake, which makes
  screenshots and reduced-motion testing easier.

---

## Attaching it to a bot in BotFather

Telegram will only load a Mini App over **HTTPS**. For local development, tunnel
the dev server first:

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

To go live, host `dist/` anywhere with HTTPS and point the Web App URL at it —
`/setmenubutton` and the `/newapp` URL can both be edited later from BotFather.

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
├── tsconfig.json              # strict, noUnusedLocals/Parameters
└── src
    ├── main.tsx               # mount + stylesheet imports
    ├── App.tsx                # Telegram handshake, 1s game clock, screen router
    ├── game
    │   ├── types.ts           # Needs, SaveData, GameState, item defs
    │   ├── config.ts          # WORLD names, need decay, actions, foods, regalia, mini-game tuning
    │   ├── store.ts           # useSyncExternalStore store + tick() decay clock
    │   ├── persistence.ts     # localStorage save/load, migration, offline decay
    │   ├── actions.ts         # every player verb: feed, sleep, wash, play, train, pet, buy, equip
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
    │   ├── Ribbon.tsx, ScreenHeader.tsx, CurrencyBar.tsx, SpeechBox.tsx,
    │   ├── Modal.tsx, FloatingTextLayer.tsx
    │   └── RoomCanvas.tsx     # the main-room stage: one canvas, one rAF loop, hotspot taps
    ├── screens                # the seven MVP screens
    │   ├── BootScreen.tsx     # title, portrait, audio-unlock gesture
    │   ├── RoomScreen.tsx     # the main loop: stage + need bars + action bar
    │   ├── FeedScreen.tsx     # larder
    │   ├── WardrobeScreen.tsx # regalia, with a live preview
    │   ├── TrainScreen.tsx    # tap-the-dummy mini-game
    │   ├── ShopScreen.tsx     # provisions + regalia
    │   └── SettingsScreen.tsx # comforts, tally, wipe save
    ├── telegram
    │   └── telegram.ts        # the entire Telegram surface, feature-detected
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

**Saving.** Writes are debounced 500 ms and flushed on `pagehide` and on
`visibilitychange → hidden`. The loader repairs corrupt or partial saves field by
field rather than throwing them away.

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
  of nav buttons never disappears, since it is the only way into the Market,
  the Regalia and the Keep.
- All copy is deliberately dry. If a line sounds like it is being nice to you,
  it is probably a bug.
