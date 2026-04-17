# Audio assets

Drop two files here to activate sound:

- `ambient.mp3` — a ~30s loopable ambient drone (synth pad + low sub). Search [freesound.org](https://freesound.org) with the filter "CC0" for terms like *ambient drone loop*, *cinematic pad loop*, *dark ambient loop*. Aim for ~30s duration, <1MB. Played at 35% volume, looped, only when the user unmutes.
- `ping.mp3` — a short (~0.3s) UI notification sound. Used when Amina's phone card appears. Search *soft UI notification CC0*.

If either file is missing the simulator continues to work silently — the `<audio>` elements fail open.

Both files are gitignored in the parent `.gitignore`; to include them in the repo, explicitly add them via `git add -f public/audio/ambient.mp3`.
