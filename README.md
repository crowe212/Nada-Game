# Coast to Coast

A 60-second, 50-state road trip game for the NADA Show 2027 booth, built around
DLR50™ by DLRdmv (out-of-state titling in all 50 states). Drive from California to
Florida, title all 50 states, and get on the leaderboard.

## How it plays

- **Tap left / right** to change lanes (arrow keys on a computer).
- **Grab titles** to score. Every 4 in a row raises your multiplier (up to ×5).
- **Dodge the old way**: WRONG FEE, RE-SIGN, LATE PENALTY, RETURNED, TITLE BRAND,
  NO STATUS. A hit slows you down and wipes your streak.
- **Press your luck**: collect three shields for the JACKPOT. For a few seconds
  DLR50 goes Full-Service — you speed up, can't crash, and every piece of red tape
  gets stamped APPROVED for points. Hit red tape before the third shield and the
  shields are spent covering it (Safety Margin™): no slowdown, but you start the
  jackpot count over.
- The route is ordered so the scenery matches the states: Pacific coast and Hawaii,
  snowy Alaska, the Northwest and Rockies, the desert Southwest, Texas and the
  plains, the Northeast in fall colour, the South, and a Florida sunset.
- Each state line is worth points. Reaching all 50 before the clock runs out pays a
  big bonus plus extra for every second left.

## Where the ideas came from

| From the meeting | In the game |
| --- | --- |
| "Coast to coast" theme, "driving results coast to coast" | The whole trip: California → Florida, scenery changes along the way |
| Short, quick racing game with a leaderboard | 60-second runs, score, leaderboard, share button |
| Three shields = jackpot (slot machine) | Three shield slots at the top of the screen |
| Press Your Luck with penalties like "you misfiled a form" | Red tape wipes your shields before the jackpot |
| The title clerk grind, then life with the product | Red tape is the old way; Full-Service mode is DLR50 doing it for you |
| "Focused on 50" | 50 state lines to cross |
| Web-based instead of a download | Runs in the phone browser; the iPhone app is optional |

## Try it

On a computer: `npm start`, then open http://localhost:8080.

On a phone: the game publishes itself to GitHub Pages whenever `www` changes (see
`.github/workflows/pages.yml`). This needs Pages switched on once: repository
Settings → Pages → Source → **GitHub Actions**. The link is then
https://crowe212.github.io/Nada-Game/. Open it in Safari and use Share →
**Add to Home Screen** to get a full-screen icon that also works offline.

## Build the iPhone app

Needs a Mac with Xcode 16 or newer.

1. Open `ios/App/App.xcodeproj` in Xcode (it downloads Capacitor on first open).
2. Select the **App** target → Signing & Capabilities → choose your team, and change
   the bundle identifier from `com.example.coasttocoast` to your own.
3. Pick an iPhone or simulator and press Run.

After changing anything in `www`, run `npm install` once and then
`npx cap sync ios` to copy the changes into the app.

## Change the wording

The top of `www/game.js` has the product and company names, event name, end-of-game message, run
length, jackpot length and license plate text. The hazard labels, state order and scenery regions are right below. Product
wording was taken from dlr50.com.

## Known limits

- The leaderboard is saved on each device. A shared, booth-wide leaderboard needs a
  small online score service, which is not built yet.
- The iPhone project was generated on Linux and has not been compiled in Xcode yet.
