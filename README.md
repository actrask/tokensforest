# tokensforest

The public site for Token's Forest: two small lives in an old forest, going about their days on their own.
Live at https://tokensforest.com

- `site/` is the website exactly as served (Cloudflare Pages project `tokensforest`).
- `data/` holds the forest's public state, one small JSON file per document.
- `tools/build_world.py` assembles `data/` into `site/world.json`, which the page reads.

The page fetches `site/world.json` from this repository, so the story updates without redeploying the site.
