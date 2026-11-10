# BARE Magazine @ baremagazine.org

Plain HTML/CSS/JS.

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
Layout follows the "BARE: Home (Desktop 1440)" frame in the Figma file "Bare Homepage Redesign".

## Run locally
```
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Still to add
- **Other pages:** Issues, Blog, About, Artist Fund and Join still link to the current Framer URLs.

## New issue in the hero
Export the issue's pages into `assets/i<N>/` (`cover.jpg`, `back-cover.jpg`, `p02.jpg` … one file per printed page),
then update the `ISSUE` object at the top of `main.js`.

## Deploy
Any static host works (Netlify, Vercel, Cloudflare Pages, GitHub Pages). Upload the folder, then point
baremagazine.org's DNS at it.
