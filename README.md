# Coast to Coast

A 60-second, 50-state road trip game for the NADA Show 2027 booth.
Drive from California to Florida, title all 50 states, and get on the leaderboard.

## How it plays

- **Tap left / right** to change lanes (arrow keys on a computer).
- **Grab titles** to score. Every 4 in a row raises your multiplier (up to ×5).
- **Dodge the red tape**: REJECTED, WRONG FEE, MISFILED, DMV LINE, LATE FEE, RE-SUBMIT.
  A hit slows you down and wipes your streak.
- **Press your luck**: collect three shields for the JACKPOT. For a few seconds
  DLRdmv Autopilot takes over — you speed up, can't crash, and every piece of red
  tape gets stamped APPROVED for points. Hit red tape before the third shield and
  you lose the shields you were holding.
- Each state line is worth points. Reaching all 50 before the clock runs out pays a
  big bonus plus extra for every second left.

## Where the ideas came from

| From the meeting | In the game |
| --- | --- |
| "Coast to coast" theme, "driving results coast to coast" | The whole trip: California → Florida, scenery changes along the way |
| Short, quick racing game with a leaderboard | 60-second runs, score, leaderboard, share button |
| Three shields = jackpot (slot machine) | Three shield slots at the top of the screen |
| Press Your Luck with penalties like "you misfiled a form" | Red tape wipes your shields before the jackpot |
| The title clerk grind, then life with the product | Red tape is the grind; Autopilot is the product doing it for you |
| "Focused on 50" | 50 state lines to cross |
| Web-based instead of a download | Runs in the phone browser; the iPhone app is optional |

## Try it

On a computer: `npm start`, then open http://localhost:8080.

On a phone without the App Store: host the `www` folder on any website, open it in
Safari, then Share → **Add to Home Screen**. It opens full screen and works offline.

## Build the iPhone app

Needs a Mac with Xcode 16 or newer.

1. Open `ios/App/App.xcodeproj` in Xcode (it downloads Capacitor on first open).
2. Select the **App** target → Signing & Capabilities → choose your team, and change
   the bundle identifier from `com.example.coasttocoast` to your own.
3. Pick an iPhone or simulator and press Run.

After changing anything in `www`, run `npm install` once and then
`npx cap sync ios` to copy the changes into the app.

## Change the wording

The top of `www/game.js` has the brand name, event name, end-of-game message, run
length and jackpot length. The hazard labels and state order are right below.

## Known limits

- The leaderboard is saved on each device. A shared, booth-wide leaderboard needs a
  small online score service, which is not built yet.
- The iPhone project was generated on Linux and has not been compiled in Xcode yet.
