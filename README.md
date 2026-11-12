# Coast to Coast

A 90-second, 50-state road trip game for the NADA Show 2027 booth, built around
DLR50™ by DLRdmv (out-of-state titling in all 50 states). Drive from California to
Florida, title all 50 states, and get on the leaderboard.

## How it plays

- **Slide your thumb** left and right anywhere on the screen to steer (arrow keys on a
  computer). The road has straights and bends.
- **Grab titles** to score. A streak raises your multiplier (up to ×5).
- **Dodge the old way**: WRONG FEE, RETURNED, GOOGLING IT, NO ETA, DUPE TITLE, RE-SIGN,
  LIEN ISSUE, MORE HOOPS, LATE PENALTY. Every hurdle you touch breaks. A hit slows you
  down, wipes your streak and damages the car; after 4 hits the car is totaled and the
  run ends early.
- **Press your luck**: collect three shields for the JACKPOT. For a few seconds DLR50
  goes Full-Service — you speed up, can't crash, and every hurdle is stamped APPROVED.
  Hit a hurdle while holding shields and they are spent covering it (Safety Margin™):
  no damage, but the jackpot count starts over.
- **Roles change the game**: Title Clerk builds streaks faster, Controller starts with
  one shield, Finance has a higher top speed, GM's car takes one extra hit. The role
  also tailors the message on the results screen.
- **The route is a real drive** from Northern California to Orlando in which each state
  borders the one before. Hawaii and Alaska can't be driven to, so those two are
  signed "by ship from Oakland" and "by ferry from Bellingham". Scenery follows the
  region you are in.
- **Tough states** (California, Colorado, Pennsylvania, Rhode Island, New Hampshire,
  North Carolina, Florida) have orange signs, more hurdles and double state-line
  points, and show a Fast Fact as you enter. The facts come from sales-call notes and
  are **not verified** — have a title expert check `FAST_FACTS` in `www/game.js`.
- It starts gently (no hurdles for the first few seconds) and gets steadily harder,
  with the densest stretch on the run-in to Florida.
- A run lasts 90 seconds. Reaching all 50 states early pays a bonus per second left.

## More in the game

- **Temp tag countdown**: the clock is a 90-day temp tag, one day per second. Run out and the tag expires.
- **Power-ups**: AccuFee™ pulls in every title for a few seconds; eQA Corrections repairs one hit.
- **Shout-outs**: streak and milestone lines in the words prospects use ("Penny perfect!",
  "It's like a little DMV Christmas!").
- **Stars and paint jobs**: each run earns up to 3 stars (15, 30 and 50 states). Stars add up to
  unlock paint: Temp Tag White, DMV Beige, Midnight Navy, Safety Margin Gold.
- **State signs** stand on the shoulder; a checkered arch marks the Florida finish.
- **Pause button**, results stats and a personal-best banner.

## Song

Save the song as `www/audio/perfect-it.mp3`. It starts on the first tap (browsers do not allow
sound before that) and loops. Without the file, a built-in synth loop plays during runs.

## Shared leaderboard and tester feedback

Both use one Google Sheet you own. Follow the steps at the top of
`tools/leaderboard-apps-script.gs`, then paste the web-app URL into `LEADERBOARD_URL` at the top
of `www/game.js`. Scores go to a "Scores" tab and feedback to a "Feedback" tab. Until that is
set, scores stay on each device and the Feedback button hands the note to the phone's share
sheet instead.

## Where the ideas came from

| From the meeting | In the game |
| --- | --- |
| "Coast to coast" theme, "driving results coast to coast" | The whole trip: California → Florida, scenery changes along the way |
| Short, quick racing game with a leaderboard | 90-second runs, score, leaderboard, share button |
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

The top of `www/game.js` has the product and company names, event name, hits allowed, end-of-game message, run
length, jackpot length and license plate text. The hazard labels, state order and scenery regions are right below. Product
wording was taken from dlr50.com.

## Known limits

- The shared leaderboard and feedback inbox need the Google Sheet set up (see above).
- The iPhone project was generated on Linux and has not been compiled in Xcode yet.
