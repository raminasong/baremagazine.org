# BARE Magazine — baremagazine.org

Plain HTML/CSS/JS, no build step, and no outside services: fonts, three.js and images are all served from this folder, so the site keeps working for as long as it's hosted.

```
index.html          homepage
styles.css          all styling; colors and type sizes are variables at the top
main.js             the 3D i38 magazine in the hero
assets/
  brand/logo.svg    BARE wordmark (vector, from the Figma file)
  fonts/            Libre Caslon Text + Inter (.woff2) and their open-font licenses
  js/               three.js (MIT license)
  i38/              every page of i38: Stained, used by the 3D magazine
  photos/           photo band, About photo, BARE's Latest cover
  stories/          story thumbnails (add these, see below)
```

## Design source
Layout follows the "BARE — Home (Desktop 1440)" frame in the Figma file "Bare Homepage Redesign".
The color names in `styles.css` (`--color-bg-dark`, `--color-text-on-dark-accent`, …) match the Figma variables
on its Style Guide page, so a change in one is easy to mirror in the other.

## Run locally
```
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Still to add
- **Story thumbnails:** save the three images from the current site into `assets/stories/` as
  `san-francisco-by-my-side.jpg`, `interviews-on-bare-strip.jpg` and `over-time.jpg`.
- **About photo:** `assets/photos/about.jpg` is a stand-in from i38; replace it with the original
  (people with white sheets) from the current site.
- **Social image:** add `assets/og.png` (1200×630).
- **Other pages:** Issues, Blog, About, Artist Fund and Join still link to the current Framer URLs.

## New issue in the hero
Export the issue's pages into `assets/i<N>/` (`cover.jpg`, `back-cover.jpg`, `p02.jpg` … one file per printed page),
then update the `ISSUE` object at the top of `main.js`.

## Deploy
Any static host works (Netlify, Vercel, Cloudflare Pages, GitHub Pages). Upload the folder, then point
baremagazine.org's DNS at it.
