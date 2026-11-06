# guille-gil.github.io

Jekyll site using the Minimal Mistakes remote theme. It builds on GitHub Pages with no local toolchain.

## Deployment

1. Create a public repository named exactly `guille-gil.github.io`.
2. Copy the contents of this folder into the repository root and push to `main`.
3. Settings, then Pages, then set source to Deploy from a branch, branch `main`, folder `/ (root)`.
4. The site appears at https://guille-gil.github.io within a couple of minutes.

## Before the first push

Edit `_config.yml`, `index.md`, and the pages in `_pages/`.

Add a square profile photo at `assets/images/profile.jpg`, roughly 400 by 400 pixels.

Add the CV at `assets/cv.pdf`, or remove the CV entry from `_data/navigation.yml`.

Delete any placeholder entry that does not yet apply. An empty section reads better than a section of brackets.

## Local preview, optional

```
bundle install
bundle exec jekyll serve
```

## Background animation

The page carries a knowledge graph animation drawn on a canvas behind the content. Nodes drift and link to near neighbours, small pulses traverse the edges, nearby nodes move away from the cursor and connect to it, and a click sends a traversal outward from the closest node. Visitors who prefer reduced motion see a single static frame.

The script is `assets/js/graph-bg.js`, the styles are `assets/css/graph.css`, and both are loaded through `_includes/head/custom.html` and `_includes/footer/custom.html`, which Minimal Mistakes picks up automatically. The labels on the nodes are the `LABELS` array at the top of the script. To remove the animation, delete the two include files.

## Appearance

Set `minimal_mistakes_skin` in `_config.yml` to one of `air`, `contrast`, `dark`, `dirt`, `mint`, `neon`, `plum`, `sunrise`.

For custom styles, create `assets/css/main.scss` containing an empty front matter block, then `@import "minimal-mistakes";`, then the custom rules.

## Custom domain

Add a `CNAME` file at the repository root containing the domain, then point a CNAME DNS record at `guille-gil.github.io`.
