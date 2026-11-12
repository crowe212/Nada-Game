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

## The story: pass the deal

One out-of-state deal moves from desk to desk as the car crosses the country. Each desk has its own
hurdles, in the words prospects use on sales calls, and its own DLR50 fix as a power-up.

| Leg | States | Hurdles | Power-up |
| --- | --- | --- | --- |
| F&I desk | 1–12 | WRONG FEE, GOOGLING IT, RE-SIGN, BLANK FORM | AccuFee™ |
| Title desk | 13–25 | RETURNED, DUPE TITLE, MORE HOOPS, TITLE BRAND | eQA Corrections |
| Controller's office | 26–38 | LATE PENALTY, WRITE-OFF, LIEN ISSUE, CHASING $$ | Verified Proof of Lien |
| GM's office | 39–50 | NO ETA, ANGRY CALL, BAD REVIEW, IN THE DARK | Live Timeline (+5 days) |

Your role's own desk pays double for titles. The results screen ends with a deal recap: how many
hits each desk took and what DLR50 does about that desk's problem. All of this is in `DESKS` near
the top of `www/game.js`.

The leaderboard has **Today** and **Whole event** tabs.

## More in the game

- **Temp tag countdown**: the clock is a 90-day temp tag, one day per second. Run out and the tag expires.
- **Power-ups**: AccuFee™ pulls in every title for a few seconds; eQA Corrections repairs one hit.
- **Shout-outs**: streak and milestone lines in the words prospects use ("Penny perfect!",
  "It's like a little DMV Christmas!").
- **Stars and paint jobs**: each run earns up to 3 stars (15, 30 and 50 states). Stars add up to
  unlock paint: Temp Tag White, DMV Beige, Midnight Navy, Safety Margin Gold.
- **State signs** stand on the shoulder; a checkered arch marks the Florida finish.
- **Pause button**, results stats and a personal-best banner.
- **Damage matters**: each hit costs 7% of top speed and shows on the car (dents, a broken tail
  light, smoke). eQA repairs only appear while the car is damaged.
- **More on the road**: slow SNAIL MAIL trucks that sit in a lane, and a "DMV · TAKE A NUMBER"
  checkpoint at each tough state with two windows closed and one open.
- **Weather and night**: rain in Oregon and Washington, snow in Alaska, night driving with
  headlights from Nebraska to Minnesota.
- **Landmarks**: a bridge in California, a needle tower in Washington, buttes, oil derricks, an
  arch in Missouri, a skyline, a statue in New York, lighthouses, a giant peach, rockets.

## Song

Upload the song into `www/audio` (either `perfect-it.mp3` or the original `PERFECT IT.mp3` name works). It starts on the first tap (browsers do not allow
sound before that) and loops. Without the file, a built-in synth loop plays during runs.

## Shared leaderboard and tester feedback

Both use one Google Sheet you own. Follow the steps at the top of
`tools/leaderboard-apps-script.gs`, then paste the web-app URL into `LEADERBOARD_URL` at the top
of `www/game.js`. Scores go to a "Scores" tab and feedback to a "Feedback" tab. This is set up and live. If the
sheet is ever unreachable, the game shows the last list it loaded.

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
