# Guitar samples

`acoustic_guitar_nylon-mp3.js`, `acoustic_guitar_steel-mp3.js` and `electric_guitar_jazz-mp3.js` are recorded guitar notes (A0 to C8, one MP3 per pitch, base64 inside a JS file) from the **FluidR3 GM** soundfont by Frank Wen, released under [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/us/), converted by [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) (downloaded from `https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/`, 20 Nov 2026).

The attribution is shown at the bottom of the catalog page. `src/shared/audio.ts` loads them: the files are fetched on the first tap, one pitch is decoded the first time it is played, and a synthesised pluck stands in if the files can't be fetched.
