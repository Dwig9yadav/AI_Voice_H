// ================================================================
// ROSS AI — Action Engine v3  "Navigator"
// ================================================================
//
//  ● 400+ hardcoded site mappings across 30+ categories
//  ● Smart URL inference (8-layer fallback pipeline)
//  ● Country / region-aware domains (.in .uk .au .ca etc)
//  ● Deep-link support  (spotify:// youtube:// discord:// etc)
//  ● Platform-specific page routing (artist · playlist · channel · profile)
//  ● Multi-site opener with staggered popup-blocker bypass
//  ● 8 search engines + category-aware search routing
//  ● Levenshtein fuzzy site-name matching
//  ● URL sanitisation + protocol normalisation
//  ● App-store / download link detection
//  ● Social-handle URL builder (@user → twitter/instagram/tiktok)
//  ● Wikipedia / Google shortcut handlers
//  ● Clipboard URL detection
//  ● Browser-based site history (sessionStorage)
//  ● Intent → action dispatcher (30+ intents)
//  ● Full execute() API for LLM tool calling
// ================================================================

import { memoryEngine } from './MemoryEngine.js';

// ── § 1  MASTER URL MAP  (400+ entries, 30 categories) ────────
const URL_MAP = {
  // ── GOOGLE ECOSYSTEM ──────────────────────────────────────
  google:            'https://www.google.com',
  gmail:             'https://mail.google.com',
  'google mail':     'https://mail.google.com',
  'google drive':    'https://drive.google.com',
  drive:             'https://drive.google.com',
  'google docs':     'https://docs.google.com',
  docs:              'https://docs.google.com',
  'google sheets':   'https://sheets.google.com',
  sheets:            'https://sheets.google.com',
  'google slides':   'https://slides.google.com',
  slides:            'https://slides.google.com',
  'google forms':    'https://forms.google.com',
  forms:             'https://forms.google.com',
  'google maps':     'https://maps.google.com',
  maps:              'https://maps.google.com',
  'google calendar': 'https://calendar.google.com',
  calendar:          'https://calendar.google.com',
  'google meet':     'https://meet.google.com',
  meet:              'https://meet.google.com',
  'google photos':   'https://photos.google.com',
  photos:            'https://photos.google.com',
  'google translate':'https://translate.google.com',
  translate:         'https://translate.google.com',
  'google classroom':'https://classroom.google.com',
  classroom:         'https://classroom.google.com',
  'google keep':     'https://keep.google.com',
  keep:              'https://keep.google.com',
  'google news':     'https://news.google.com',
  'google play':     'https://play.google.com',
  'play store':      'https://play.google.com',
  'google search':   'https://www.google.com',
  'google scholar':  'https://scholar.google.com',
  scholar:           'https://scholar.google.com',
  'google colab':    'https://colab.research.google.com',
  colab:             'https://colab.research.google.com',
  gemini:            'https://gemini.google.com',
  bard:              'https://gemini.google.com',
  'youtube music':   'https://music.youtube.com',
  youtube:           'https://www.youtube.com',
  yt:                'https://www.youtube.com',

  // ── SOCIAL MEDIA ──────────────────────────────────────────
  twitter:           'https://www.x.com',
  x:                 'https://www.x.com',
  'x.com':           'https://www.x.com',
  facebook:          'https://www.facebook.com',
  fb:                'https://www.facebook.com',
  instagram:         'https://www.instagram.com',
  insta:             'https://www.instagram.com',
  ig:                'https://www.instagram.com',
  tiktok:            'https://www.tiktok.com',
  'tik tok':         'https://www.tiktok.com',
  snapchat:          'https://www.snapchat.com',
  snap:              'https://www.snapchat.com',
  pinterest:         'https://www.pinterest.com',
  reddit:            'https://www.reddit.com',
  tumblr:            'https://www.tumblr.com',
  mastodon:          'https://mastodon.social',
  threads:           'https://www.threads.net',
  bluesky:           'https://bsky.app',
  linkedin:          'https://www.linkedin.com',
  quora:             'https://www.quora.com',
  'hacker news':     'https://news.ycombinator.com',
  'hackernews':      'https://news.ycombinator.com',
  hn:                'https://news.ycombinator.com',
  producthunt:       'https://www.producthunt.com',
  'product hunt':    'https://www.producthunt.com',
  clubhouse:         'https://www.clubhouse.com',
  goodreads:         'https://www.goodreads.com',
  letterboxd:        'https://letterboxd.com',
  deviantart:        'https://www.deviantart.com',
  behance:           'https://www.behance.net',
  dribbble:          'https://dribbble.com',

  // ── MESSAGING / COMMUNICATION ─────────────────────────────
  whatsapp:          'https://web.whatsapp.com',
  'whatsapp web':    'https://web.whatsapp.com',
  telegram:          'https://web.telegram.org',
  discord:           'https://discord.com/app',
  slack:             'https://slack.com',
  messenger:         'https://www.messenger.com',
  signal:            'https://signal.org',
  zoom:              'https://zoom.us',
  teams:             'https://teams.microsoft.com',
  'microsoft teams': 'https://teams.microsoft.com',
  skype:             'https://web.skype.com',
  matrix:            'https://app.element.io',
  element:           'https://app.element.io',
  rocket:            'https://rocket.chat',
  mattermost:        'https://mattermost.com',
  webex:             'https://webex.com',
  whereby:           'https://whereby.com',

  // ── STREAMING ─────────────────────────────────────────────
  spotify:           'https://open.spotify.com',
  netflix:           'https://www.netflix.com',
  'amazon prime':    'https://www.primevideo.com',
  'prime video':     'https://www.primevideo.com',
  prime:             'https://www.primevideo.com',
  hulu:              'https://www.hulu.com',
  'disney plus':     'https://www.disneyplus.com',
  'disney+':         'https://www.disneyplus.com',
  disneyplus:        'https://www.disneyplus.com',
  hbo:               'https://www.max.com',
  'hbo max':         'https://www.max.com',
  max:               'https://www.max.com',
  'apple tv':        'https://tv.apple.com',
  appletv:           'https://tv.apple.com',
  peacock:           'https://www.peacocktv.com',
  paramount:         'https://www.paramountplus.com',
  'paramount plus':  'https://www.paramountplus.com',
  'paramount+':      'https://www.paramountplus.com',
  twitch:            'https://www.twitch.tv',
  vimeo:             'https://vimeo.com',
  dailymotion:       'https://www.dailymotion.com',
  soundcloud:        'https://soundcloud.com',
  'apple music':     'https://music.apple.com',
  deezer:            'https://www.deezer.com',
  tidal:             'https://tidal.com',
  pandora:           'https://www.pandora.com',
  'amazon music':    'https://music.amazon.com',
  'iheartradio':     'https://www.iheart.com',
  'tunein':          'https://tunein.com',
  'crunchyroll':     'https://www.crunchyroll.com',
  '9anime':          'https://9anime.to',
  'funimation':      'https://www.funimation.com',
  'aniwatch':        'https://aniwatch.to',
  'kickassanime':    'https://kickassanime.am',
  mxplayer:          'https://www.mxplayer.in',
  hotstar:           'https://www.hotstar.com',
  'jio cinema':      'https://www.jiocinema.com',
  jiociema:          'https://www.jiocinema.com',
  zee5:              'https://www.zee5.com',
  sonyliv:           'https://www.sonyliv.com',
  'sony liv':        'https://www.sonyliv.com',
  altbalaji:         'https://www.altbalaji.com',
  voot:              'https://www.voot.com',
  curiositystream:   'https://curiositystream.com',
  'curiosity stream':'https://curiositystream.com',
  mubi:              'https://mubi.com',
  shudder:           'https://www.shudder.com',
  criterion:         'https://www.criterionchannel.com',

  // ── AI & CODING TOOLS ─────────────────────────────────────
  chatgpt:           'https://chat.openai.com',
  'chat gpt':        'https://chat.openai.com',
  openai:            'https://openai.com',
  claude:            'https://claude.ai',
  anthropic:         'https://anthropic.com',
  groq:              'https://console.groq.com',
  'groq cloud':      'https://console.groq.com',
  perplexity:        'https://www.perplexity.ai',
  mistral:           'https://chat.mistral.ai',
  copilot:           'https://copilot.microsoft.com',
  'github copilot':  'https://github.com/features/copilot',
  'bing chat':       'https://bing.com/chat',
  'microsoft copilot':'https://copilot.microsoft.com',
  huggingface:       'https://huggingface.co',
  'hugging face':    'https://huggingface.co',
  'ollama':          'https://ollama.ai',
  'replicate':       'https://replicate.com',
  'together ai':     'https://together.ai',
  'together':        'https://together.ai',
  anyscale:          'https://anyscale.com',
  'runway':          'https://runwayml.com',
  midjourney:        'https://www.midjourney.com',
  'stable diffusion':'https://stablediffusionweb.com',
  'dall-e':          'https://labs.openai.com',
  'adobe firefly':   'https://firefly.adobe.com',
  sora:              'https://openai.com/sora',
  character:         'https://character.ai',
  'character ai':    'https://character.ai',
  poe:               'https://poe.com',
  phind:             'https://www.phind.com',
  'you.com':         'https://you.com',
  you:               'https://you.com',
  kagi:              'https://kagi.com',

  // ── DEVELOPER TOOLS ───────────────────────────────────────
  github:            'https://www.github.com',
  gitlab:            'https://gitlab.com',
  bitbucket:         'https://bitbucket.org',
  stackoverflow:     'https://stackoverflow.com',
  'stack overflow':  'https://stackoverflow.com',
  'stack exchange':  'https://stackexchange.com',
  npm:               'https://www.npmjs.com',
  pypi:              'https://pypi.org',
  'crates.io':       'https://crates.io',
  crates:            'https://crates.io',
  'rubygems':        'https://rubygems.org',
  'packagist':       'https://packagist.org',
  'nuget':           'https://www.nuget.org',
  codepen:           'https://codepen.io',
  codesandbox:       'https://codesandbox.io',
  'code sandbox':    'https://codesandbox.io',
  stackblitz:        'https://stackblitz.com',
  'stack blitz':     'https://stackblitz.com',
  replit:            'https://replit.com',
  jsfiddle:          'https://jsfiddle.net',
  'js fiddle':       'https://jsfiddle.net',
  glitch:            'https://glitch.com',
  'vscode':          'https://vscode.dev',
  'vs code online':  'https://vscode.dev',
  devdocs:           'https://devdocs.io',
  'dev docs':        'https://devdocs.io',
  mdn:               'https://developer.mozilla.org',
  'mdn web docs':    'https://developer.mozilla.org',
  'can i use':       'https://caniuse.com',
  caniuse:           'https://caniuse.com',
  bundlephobia:      'https://bundlephobia.com',
  'bundle phobia':   'https://bundlephobia.com',
  regex101:          'https://regex101.com',
  'regex 101':       'https://regex101.com',
  'jwt.io':          'https://jwt.io',
  jwt:               'https://jwt.io',
  postman:           'https://www.postman.com',
  swagger:           'https://editor.swagger.io',
  'public apis':     'https://publicapis.dev',
  'apis guru':       'https://apis.guru',
  'ray.so':          'https://ray.so',
  carbon:            'https://carbon.now.sh',
  excalidraw:        'https://excalidraw.com',
  dbdiagram:         'https://dbdiagram.io',
  'db diagram':      'https://dbdiagram.io',
  'readme.so':       'https://readme.so',
  gitignore:         'https://www.toptal.com/developers/gitignore',
  semver:            'https://semver.org',
  roadmap:           'https://roadmap.sh',
  'roadmap.sh':      'https://roadmap.sh',
  devhints:          'https://devhints.io',
  overapi:           'https://overapi.com',
  'leetcode':        'https://leetcode.com',
  leet:              'https://leetcode.com',
  'hackerrank':      'https://www.hackerrank.com',
  codeforces:        'https://codeforces.com',
  'codechef':        'https://www.codechef.com',
  'atcoder':         'https://atcoder.jp',
  'project euler':   'https://projecteuler.net',
  exercism:          'https://exercism.org',
  'advent of code':  'https://adventofcode.com',
  'the algorithms':  'https://the-algorithms.com',
  // docs
  'react docs':      'https://react.dev',
  'react':           'https://react.dev',
  vuejs:             'https://vuejs.org',
  'vue':             'https://vuejs.org',
  'angular':         'https://angular.dev',
  svelte:            'https://svelte.dev',
  'next.js':         'https://nextjs.org',
  nextjs:            'https://nextjs.org',
  'nuxt':            'https://nuxt.com',
  'astro':           'https://astro.build',
  'vite':            'https://vitejs.dev',
  'tailwind':        'https://tailwindcss.com',
  'tailwindcss':     'https://tailwindcss.com',
  'bootstrap':       'https://getbootstrap.com',
  'shadcn':          'https://ui.shadcn.com',
  'framer motion':   'https://www.framer.com/motion',
  'gsap':            'https://gsap.com',
  'three.js':        'https://threejs.org',
  'd3':              'https://d3js.org',
  'node.js':         'https://nodejs.org',
  'nodejs':          'https://nodejs.org',
  'deno':            'https://deno.com',
  'bun':             'https://bun.sh',
  'rust lang':       'https://www.rust-lang.org',
  'rust':            'https://www.rust-lang.org',
  'golang':          'https://go.dev',
  'go lang':         'https://go.dev',
  'python':          'https://www.python.org',
  'python docs':     'https://docs.python.org',
  'typescript':      'https://www.typescriptlang.org',
  'docker':          'https://www.docker.com',
  'docker hub':      'https://hub.docker.com',
  'kubernetes':      'https://kubernetes.io',
  'k8s':             'https://kubernetes.io',
  'terraform':       'https://www.terraform.io',
  'ansible':         'https://www.ansible.com',
  'grafana':         'https://grafana.com',
  'prometheus':      'https://prometheus.io',
  'elasticsearch':   'https://www.elastic.co',
  'mongodb':         'https://www.mongodb.com',
  'postgres':        'https://www.postgresql.org',
  'postgresql':      'https://www.postgresql.org',
  'mysql':           'https://www.mysql.com',
  'redis':           'https://redis.io',
  'supabase':        'https://supabase.com',
  'firebase':        'https://firebase.google.com',
  'appwrite':        'https://appwrite.io',
  'pocketbase':      'https://pocketbase.io',

  // ── CLOUD PLATFORMS ───────────────────────────────────────
  'aws':             'https://aws.amazon.com',
  'amazon aws':      'https://aws.amazon.com',
  'azure':           'https://portal.azure.com',
  'microsoft azure': 'https://portal.azure.com',
  'gcp':             'https://cloud.google.com',
  'google cloud':    'https://cloud.google.com',
  'cloudflare':      'https://www.cloudflare.com',
  'cloudflare workers':'https://workers.cloudflare.com',
  'vercel':          'https://vercel.com',
  'netlify':         'https://www.netlify.com',
  'heroku':          'https://www.heroku.com',
  'railway':         'https://railway.app',
  'render':          'https://render.com',
  'fly.io':          'https://fly.io',
  'digital ocean':   'https://www.digitalocean.com',
  'digitalocean':    'https://www.digitalocean.com',
  'linode':          'https://www.linode.com',
  'vultr':           'https://www.vultr.com',
  'hetzner':         'https://www.hetzner.com',
  'planetscale':     'https://planetscale.com',
  'neon':            'https://neon.tech',
  'turso':           'https://turso.tech',
  'upstash':         'https://upstash.com',
  'convex':          'https://www.convex.dev',

  // ── DESIGN & CREATIVE ─────────────────────────────────────
  figma:             'https://www.figma.com',
  canva:             'https://www.canva.com',
  'adobe':           'https://www.adobe.com',
  'adobe xd':        'https://www.adobe.com/products/xd.html',
  'adobe photoshop': 'https://www.adobe.com/products/photoshop.html',
  'adobe illustrator':'https://www.adobe.com/products/illustrator.html',
  'adobe premiere':  'https://www.adobe.com/products/premiere.html',
  'adobe after effects':'https://www.adobe.com/products/aftereffects.html',
  framer:            'https://www.framer.com',
  'sketch':          'https://www.sketch.com',
  invision:          'https://www.invisionapp.com',
  zeplin:            'https://zeplin.io',
  penpot:            'https://penpot.app',
  photopea:          'https://www.photopea.com',
  'remove bg':       'https://www.remove.bg',
  removebg:          'https://www.remove.bg',
  unsplash:          'https://unsplash.com',
  pexels:            'https://www.pexels.com',
  pixabay:           'https://pixabay.com',
  'freepik':         'https://www.freepik.com',
  flaticon:          'https://www.flaticon.com',
  'font awesome':    'https://fontawesome.com',
  fontawesome:       'https://fontawesome.com',
  'google fonts':    'https://fonts.google.com',
  fonts:             'https://fonts.google.com',
  dafont:            'https://www.dafont.com',
  'coolors':         'https://coolors.co',
  colorhunt:         'https://colorhunt.co',
  'color hunt':      'https://colorhunt.co',
  'ui colors':       'https://uicolors.app',
  'realtime colors': 'https://www.realtimecolors.com',
  grabient:          'https://www.grabient.com',
  'css gradient':    'https://cssgradient.io',
  icons8:            'https://icons8.com',
  heroicons:         'https://heroicons.com',
  lucide:            'https://lucide.dev',
  tabler:            'https://tabler.io/icons',
  iconfinder:        'https://www.iconfinder.com',
  noun:              'https://thenounproject.com',
  lottiefiles:       'https://lottiefiles.com',
  'lottie':          'https://lottiefiles.com',
  spline:            'https://spline.design',
  '3d':              'https://spline.design',
  rive:              'https://rive.app',
  runway:            'https://runwayml.com',
  elevenlabs:        'https://elevenlabs.io',
  'eleven labs':     'https://elevenlabs.io',

  // ── PRODUCTIVITY ──────────────────────────────────────────
  notion:            'https://www.notion.so',
  obsidian:          'https://obsidian.md',
  'roam':            'https://roamresearch.com',
  'roam research':   'https://roamresearch.com',
  logseq:            'https://logseq.com',
  'bear':            'https://bear.app',
  evernote:          'https://www.evernote.com',
  'one note':        'https://www.onenote.com',
  onenote:           'https://www.onenote.com',
  'cherry tree':     'https://www.giuspen.com/cherrytree',
  'standard notes':  'https://standardnotes.com',
  'anytype':         'https://anytype.io',
  'coda':            'https://coda.io',
  'airtable':        'https://airtable.com',
  'trello':          'https://trello.com',
  asana:             'https://asana.com',
  jira:              'https://www.atlassian.com/software/jira',
  'linear':          'https://linear.app',
  'plane':           'https://plane.so',
  clickup:           'https://clickup.com',
  monday:            'https://monday.com',
  basecamp:          'https://basecamp.com',
  todoist:           'https://todoist.com',
  'things':          'https://culturedcode.com/things',
  ticktick:          'https://ticktick.com',
  'tick tick':       'https://ticktick.com',
  'microsoft todo':  'https://to-do.office.com',
  'google tasks':    'https://tasks.google.com',
  'confluence':      'https://www.atlassian.com/software/confluence',
  'slab':            'https://slab.com',
  gitbook:           'https://www.gitbook.com',
  'git book':        'https://www.gitbook.com',
  'microsoft office':'https://www.office.com',
  office:            'https://www.office.com',
  'office 365':      'https://www.office.com',
  'microsoft 365':   'https://www.office.com',
  word:              'https://www.office.com/launch/word',
  'microsoft word':  'https://www.office.com/launch/word',
  excel:             'https://www.office.com/launch/excel',
  powerpoint:        'https://www.office.com/launch/powerpoint',
  outlook:           'https://outlook.live.com',
  'microsoft outlook':'https://outlook.live.com',

  // ── E-COMMERCE & FINANCE ──────────────────────────────────
  amazon:            'https://www.amazon.com',
  'amazon india':    'https://www.amazon.in',
  'amazon.in':       'https://www.amazon.in',
  flipkart:          'https://www.flipkart.com',
  meesho:            'https://www.meesho.com',
  myntra:            'https://www.myntra.com',
  nykaa:             'https://www.nykaa.com',
  ajio:              'https://www.ajio.com',
  'tata cliq':       'https://www.tatacliq.com',
  croma:             'https://www.croma.com',
  reliance:          'https://www.reliancedigital.in',
  snapdeal:          'https://www.snapdeal.com',
  ebay:              'https://www.ebay.com',
  etsy:              'https://www.etsy.com',
  aliexpress:        'https://www.aliexpress.com',
  alibaba:           'https://www.alibaba.com',
  shopify:           'https://www.shopify.com',
  woocommerce:       'https://woocommerce.com',
  'paypal':          'https://www.paypal.com',
  paytm:             'https://www.paytm.com',
  gpay:              'https://pay.google.com',
  'google pay':      'https://pay.google.com',
  phonepe:           'https://www.phonepe.com',
  razorpay:          'https://razorpay.com',
  stripe:            'https://stripe.com',
  'binance':         'https://www.binance.com',
  coinbase:          'https://www.coinbase.com',
  'kraken':          'https://www.kraken.com',
  'wazirx':          'https://wazirx.com',
  zerodha:           'https://zerodha.com',
  groww:             'https://groww.in',
  'upstox':          'https://upstox.com',
  'robinhood':       'https://robinhood.com',
  'trading view':    'https://www.tradingview.com',
  tradingview:       'https://www.tradingview.com',
  investing:         'https://www.investing.com',
  'yahoo finance':   'https://finance.yahoo.com',
  'google finance':  'https://finance.google.com',

  // ── NEWS & INFORMATION ────────────────────────────────────
  wikipedia:         'https://www.wikipedia.org',
  wiki:              'https://www.wikipedia.org',
  'wikidata':        'https://www.wikidata.org',
  wikinews:          'https://en.wikinews.org',
  bbc:               'https://www.bbc.com',
  'bbc news':        'https://www.bbc.com/news',
  cnn:               'https://www.cnn.com',
  'cnn news':        'https://www.cnn.com',
  reuters:           'https://www.reuters.com',
  'al jazeera':      'https://www.aljazeera.com',
  aljazeera:         'https://www.aljazeera.com',
  'new york times':  'https://www.nytimes.com',
  nytimes:           'https://www.nytimes.com',
  nyt:               'https://www.nytimes.com',
  guardian:          'https://www.theguardian.com',
  'the guardian':    'https://www.theguardian.com',
  wapo:              'https://www.washingtonpost.com',
  'washington post': 'https://www.washingtonpost.com',
  bloomberg:         'https://www.bloomberg.com',
  'financial times': 'https://www.ft.com',
  forbes:            'https://www.forbes.com',
  techcrunch:        'https://techcrunch.com',
  'tech crunch':     'https://techcrunch.com',
  wired:             'https://www.wired.com',
  verge:             'https://www.theverge.com',
  'the verge':       'https://www.theverge.com',
  ars:               'https://arstechnica.com',
  'ars technica':    'https://arstechnica.com',
  arstechnica:       'https://arstechnica.com',
  engadget:          'https://www.engadget.com',
  gizmodo:           'https://gizmodo.com',
  mashable:          'https://mashable.com',
  zdnet:             'https://www.zdnet.com',
  cnet:              'https://www.cnet.com',
  'dev.to':          'https://dev.to',
  devto:             'https://dev.to',
  medium:            'https://www.medium.com',
  substack:          'https://substack.com',
  'mirror.xyz':      'https://mirror.xyz',
  'indie hackers':   'https://www.indiehackers.com',
  indiehackers:      'https://www.indiehackers.com',

  // ── EDUCATION ─────────────────────────────────────────────
  udemy:             'https://www.udemy.com',
  coursera:          'https://www.coursera.org',
  edx:               'https://www.edx.org',
  'khan academy':    'https://www.khanacademy.org',
  khanacademy:       'https://www.khanacademy.org',
  brilliant:         'https://brilliant.org',
  codecademy:        'https://www.codecademy.com',
  'code academy':    'https://www.codecademy.com',
  'freecodecamp':    'https://www.freecodecamp.org',
  'free code camp':  'https://www.freecodecamp.org',
  'the odin project':'https://www.theodinproject.com',
  odinproject:       'https://www.theodinproject.com',
  frontendmentor:    'https://www.frontendmentor.io',
  'frontend mentor': 'https://www.frontendmentor.io',
  scrimba:           'https://scrimba.com',
  pluralsight:       'https://www.pluralsight.com',
  'linked in learning':'https://www.linkedin.com/learning',
  'linkedin learning':'https://www.linkedin.com/learning',
  skillshare:        'https://www.skillshare.com',
  duolingo:          'https://www.duolingo.com',
  memrise:           'https://www.memrise.com',
  anki:              'https://apps.ankiweb.net',
  'wolfram alpha':   'https://www.wolframalpha.com',
  wolframalpha:      'https://www.wolframalpha.com',
  wolfram:           'https://www.wolframalpha.com',
  desmos:            'https://www.desmos.com',
  geogebra:          'https://www.geogebra.org',
  'symbolab':        'https://www.symbolab.com',
  mathway:           'https://www.mathway.com',
  arxiv:             'https://arxiv.org',
  'semantic scholar':'https://www.semanticscholar.org',
  'research gate':   'https://www.researchgate.net',
  researchgate:      'https://www.researchgate.net',
  jstor:             'https://www.jstor.org',
  'pubmed':          'https://pubmed.ncbi.nlm.nih.gov',

  // ── FOOD & DELIVERY ───────────────────────────────────────
  swiggy:            'https://www.swiggy.com',
  zomato:            'https://www.zomato.com',
  'uber eats':       'https://www.ubereats.com',
  ubereats:          'https://www.ubereats.com',
  doordash:          'https://www.doordash.com',
  'door dash':       'https://www.doordash.com',
  grubhub:           'https://www.grubhub.com',
  'just eat':        'https://www.just-eat.com',
  deliveroo:         'https://deliveroo.com',
  blinkit:           'https://blinkit.com',
  zepto:             'https://www.zeptonow.com',
  dunzo:             'https://dunzo.com',
  'big basket':      'https://www.bigbasket.com',
  bigbasket:         'https://www.bigbasket.com',

  // ── TRANSPORT / TRAVEL ────────────────────────────────────
  uber:              'https://m.uber.com',
  ola:               'https://www.olacabs.com',
  'ola cabs':        'https://www.olacabs.com',
  rapido:            'https://rapido.bike',
  lyft:              'https://www.lyft.com',
  'google flights':  'https://flights.google.com',
  flights:           'https://flights.google.com',
  skyscanner:        'https://www.skyscanner.com',
  kayak:             'https://www.kayak.com',
  expedia:           'https://www.expedia.com',
  booking:           'https://www.booking.com',
  'booking.com':     'https://www.booking.com',
  airbnb:            'https://www.airbnb.com',
  'air bnb':         'https://www.airbnb.com',
  trivago:           'https://www.trivago.com',
  irctc:             'https://www.irctc.co.in',
  'make my trip':    'https://www.makemytrip.com',
  makemytrip:        'https://www.makemytrip.com',
  cleartrip:         'https://www.cleartrip.com',
  goibibo:           'https://www.goibibo.com',

  // ── HEALTH / FITNESS ──────────────────────────────────────
  'web md':          'https://www.webmd.com',
  webmd:             'https://www.webmd.com',
  healthline:        'https://www.healthline.com',
  mayoclinic:        'https://www.mayoclinic.org',
  'mayo clinic':     'https://www.mayoclinic.org',
  'nhs':             'https://www.nhs.uk',
  strava:            'https://www.strava.com',
  myfitnesspal:      'https://www.myfitnesspal.com',
  'my fitness pal':  'https://www.myfitnesspal.com',
  fitbit:            'https://www.fitbit.com',
  'calm':            'https://www.calm.com',
  headspace:         'https://www.headspace.com',

  // ── GAMING ────────────────────────────────────────────────
  steam:             'https://store.steampowered.com',
  'epic games':      'https://www.epicgames.com',
  epicgames:         'https://www.epicgames.com',
  'epic':            'https://www.epicgames.com',
  gog:               'https://www.gog.com',
  'itch.io':         'https://itch.io',
  itch:              'https://itch.io',
  'roblox':          'https://www.roblox.com',
  'minecraft':       'https://www.minecraft.net',
  'xbox':            'https://www.xbox.com',
  'playstation':     'https://www.playstation.com',
  'nintendo':        'https://www.nintendo.com',
  'chess.com':       'https://www.chess.com',
  chess:             'https://www.chess.com',
  lichess:           'https://lichess.org',
  'game faqs':       'https://gamefaqs.gamespot.com',

  // ── SEARCH ENGINES ────────────────────────────────────────
  bing:              'https://www.bing.com',
  duckduckgo:        'https://duckduckgo.com',
  ddg:               'https://duckduckgo.com',
  'duck duck go':    'https://duckduckgo.com',
  ecosia:            'https://www.ecosia.org',
  startpage:         'https://www.startpage.com',
  brave:             'https://search.brave.com',
  'brave search':    'https://search.brave.com',

  // ── MISC / TOOLS ──────────────────────────────────────────
  'wayback machine': 'https://web.archive.org',
  'web archive':     'https://web.archive.org',
  archive:           'https://web.archive.org',
  'internet archive':'https://archive.org',
  'speedtest':       'https://www.speedtest.net',
  'fast.com':        'https://fast.com',
  fast:              'https://fast.com',
  'down detector':   'https://downdetector.com',
  downdetector:      'https://downdetector.com',
  'is it down':      'https://downdetector.com',
  pastebin:          'https://pastebin.com',
  'haste bin':       'https://hastebin.com',
  hastebin:          'https://hastebin.com',
  'short url':       'https://bit.ly',
  bitly:             'https://bit.ly',
  'bit.ly':          'https://bit.ly',
  tinyurl:           'https://tinyurl.com',
  'tiny url':        'https://tinyurl.com',
  'whois':           'https://who.is',
  'ip address':      'https://whatismyipaddress.com',
  'my ip':           'https://whatismyipaddress.com',
  epoch:             'https://www.epochconverter.com',
  'epoch converter': 'https://www.epochconverter.com',
  'base64':          'https://www.base64encode.org',
  'json formatter':  'https://jsonformatter.curiousconcept.com',
  'json format':     'https://jsonformatter.curiousconcept.com',
  'curl converter':  'https://curlconverter.com',
  'cron':            'https://crontab.guru',
  'cron tab':        'https://crontab.guru',
  crontab:           'https://crontab.guru',
  'temp mail':       'https://temp-mail.org',
  tempmail:          'https://temp-mail.org',
  '10 minute mail':  'https://10minutemail.com',
  'privacy tools':   'https://www.privacytools.io',
  vpnmentor:         'https://www.vpnmentor.com',
  'have i been pwned':'https://haveibeenpwned.com',
  haveibeenpwned:    'https://haveibeenpwned.com',
  'virustotal':      'https://www.virustotal.com',
  'shodan':          'https://www.shodan.io',
  'product hunt':    'https://www.producthunt.com',
  alternativeto:     'https://alternativeto.net',
  'alternative to':  'https://alternativeto.net',
  'similarsites':    'https://www.similarsites.com',
  'untools':         'https://untools.co',
  'lobste.rs':       'https://lobste.rs',
  lobsters:          'https://lobste.rs',
  'slashdot':        'https://slashdot.org',
  'tildes':          'https://tildes.net',
};

// ── § 2  COUNTRY-AWARE DOMAIN VARIANTS ───────────────────────
const COUNTRY_DOMAINS = {
  amazon:   { in:'amazon.in', uk:'amazon.co.uk', au:'amazon.com.au', ca:'amazon.ca', de:'amazon.de', fr:'amazon.fr', jp:'amazon.co.jp', mx:'amazon.com.mx' },
  google:   { in:'google.co.in', uk:'google.co.uk', au:'google.com.au', ca:'google.ca', de:'google.de', fr:'google.fr', jp:'google.co.jp' },
  youtube:  { in:'youtube.com', uk:'youtube.com', au:'youtube.com' },
  netflix:  { in:'netflix.com', uk:'netflix.com' },
  flipkart: { in:'flipkart.com' },
  yahoo:    { in:'yahoo.com', uk:'yahoo.co.uk', jp:'yahoo.co.jp' },
};

// ── § 3  DEEP LINK PROTOCOLS ─────────────────────────────────
const DEEP_LINKS = {
  spotify:  (query) => `https://open.spotify.com/search/${encodeURIComponent(query)}`,
  youtube:  (query) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
  discord:  () => 'discord://',
  whatsapp: () => 'https://web.whatsapp.com',
  telegram: () => 'https://web.telegram.org',
  mail:     (to) => `mailto:${to||''}`,
  maps:     (q) => `https://www.google.com/maps/search/${encodeURIComponent(q||'')}`,
};

// ── § 4  SEARCH ENGINE ROUTING ────────────────────────────────
const SEARCH_ENGINES = {
  google:      (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  bing:        (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  duckduckgo:  (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  ddg:         (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  brave:       (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
  ecosia:      (q) => `https://www.ecosia.org/search?q=${encodeURIComponent(q)}`,
  kagi:        (q) => `https://kagi.com/search?q=${encodeURIComponent(q)}`,
  youtube:     (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  github:      (q) => `https://github.com/search?q=${encodeURIComponent(q)}`,
  stackoverflow:(q)=> `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
  reddit:      (q) => `https://www.reddit.com/search?q=${encodeURIComponent(q)}`,
  wikipedia:   (q) => `https://en.wikipedia.org/wiki/Special:Search/${encodeURIComponent(q)}`,
  amazon:      (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  spotify:     (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
  npm:         (q) => `https://www.npmjs.com/search?q=${encodeURIComponent(q)}`,
  pypi:        (q) => `https://pypi.org/search/?q=${encodeURIComponent(q)}`,
  google_lucky:(q) => `https://www.google.com/search?btnI=1&q=${encodeURIComponent(q)}`,
};

// ── § 5  LEVENSHTEIN FOR FUZZY SITE NAME MATCHING ────────────
function lev(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (Math.abs(a.length - b.length) > 4) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[a.length][b.length];
}

// Precompute a sorted list of keys for fuzzy matching
const URL_MAP_KEYS = Object.keys(URL_MAP).sort((a, b) => a.length - b.length);

function fuzzyFindSite(input) {
  const lower = input.toLowerCase().trim();
  if (lower.length < 3) return null;
  let best = null, bestScore = 3; // max edit distance = 3
  for (const key of URL_MAP_KEYS) {
    if (Math.abs(key.length - lower.length) > 4) continue;
    const d = lev(lower, key);
    if (d < bestScore) { bestScore = d; best = key; }
    if (d === 0) break;
  }
  return best ? URL_MAP[best] : null;
}

// ── § 6  URL SANITISER ────────────────────────────────────────
function sanitizeUrl(raw) {
  let u = raw.trim();
  // Strip filler words
  u = u.replace(/\s+(website|site|page|web page|homepage|app|portal|link|url)\s*$/i, '').trim();
  // Strip "the " prefix
  u = u.replace(/^the\s+/i, '').trim();
  return u;
}

function isFullUrl(s) {
  return /^https?:\/\//i.test(s);
}

function isDomain(s) {
  return /^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,}){1,3}(\/.*)?$/.test(s);
}

function isSingleWord(s) {
  return /^[a-zA-Z0-9-]+$/.test(s);
}

// Infer likely TLD candidates for a word
function inferUrl(word) {
  const tlds = ['.com', '.org', '.net', '.io', '.co', '.app', '.dev', '.ai', '.to'];
  return tlds.map(t => `https://www.${word}${t}`);
}

// ── § 7  SESSION HISTORY (recent opens) ──────────────────────
const SESSION_KEY = 'ross_open_history';
function addToHistory(url, label) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const hist = raw ? JSON.parse(raw) : [];
    hist.unshift({ url, label, ts: Date.now() });
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(hist.slice(0, 50)));
  } catch {}
}
function getHistory() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]'); } catch { return []; }
}

// ── § 8  SOCIAL HANDLE RESOLVER ──────────────────────────────
// "open @elonmusk on twitter" → https://x.com/elonmusk
function resolveHandle(handle, platform) {
  const clean = handle.replace(/^@/, '');
  const map = {
    twitter: `https://x.com/${clean}`,
    x:       `https://x.com/${clean}`,
    instagram:`https://www.instagram.com/${clean}`,
    insta:   `https://www.instagram.com/${clean}`,
    tiktok:  `https://www.tiktok.com/@${clean}`,
    github:  `https://github.com/${clean}`,
    linkedin:`https://www.linkedin.com/in/${clean}`,
    youtube: `https://www.youtube.com/@${clean}`,
    reddit:  `https://www.reddit.com/user/${clean}`,
    twitch:  `https://www.twitch.tv/${clean}`,
    pinterest:`https://www.pinterest.com/${clean}`,
  };
  return map[platform?.toLowerCase()] || null;
}

// ── § 9  RELIABLE TAB OPENER ─────────────────────────────────
// Uses invisible <a> click instead of window.open so it works
// even when called deep inside async/await chains.
// window.open() is blocked by popup-blockers in async context;
// anchor .click() is never blocked because it mimics a real click.
function throttledOpen(url, label = '') {
  if (!url) return false;
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch {} }, 300);
    addToHistory(url, label || url);
    return true;
  } catch (e) {
    try { window.open(url, '_blank', 'noopener,noreferrer'); } catch {}
    addToHistory(url, label || url);
    return true;
  }
}

// ── MAIN ACTION ENGINE ────────────────────────────────────────
class ActionEngine {
  constructor() {
    this.urlMap = URL_MAP;
    this.searchEngines = SEARCH_ENGINES;
    this.history = [];
    this._defaultSearchEngine = 'google';
    this._country = 'com'; // set via setCountry()
  }

  setCountry(cc) {
    // cc = 'in', 'uk', 'au', 'us', etc.
    this._country = cc.toLowerCase();
  }

  // ── § A  MAIN OPEN WEBSITE (8-layer pipeline) ─────────────
  openWebsite(input, desc = '') {
    if (!input?.trim()) return { success: false, message: 'No target specified.' };

    let raw = sanitizeUrl(input);
    const lower = raw.toLowerCase().replace(/\s+/g, ' ');

    // ── Layer 0: Social handle (@user on platform) ──────────
    const handleMatch = raw.match(/^@([\w.]+)(?:\s+on\s+(\w+))?$/i);
    if (handleMatch) {
      const url = resolveHandle(handleMatch[1], handleMatch[2] || 'twitter');
      if (url) return this._open(url, `@${handleMatch[1]}`);
    }

    // ── Layer 1: Exact hardcoded map ────────────────────────
    if (this.urlMap[lower]) {
      return this._open(this.urlMap[lower], desc || raw);
    }

    // ── Layer 2: Country-aware variant ──────────────────────
    if (this._country !== 'com') {
      for (const [brand, variants] of Object.entries(COUNTRY_DOMAINS)) {
        if (lower.includes(brand) && variants[this._country]) {
          return this._open(`https://www.${variants[this._country]}`, desc || raw);
        }
      }
    }

    // ── Layer 3: Already a full URL ─────────────────────────
    if (isFullUrl(raw)) {
      return this._open(raw, desc || raw);
    }

    // ── Layer 4: Looks like a domain ────────────────────────
    if (isDomain(raw)) {
      return this._open(`https://${raw}`, desc || raw);
    }

    // ── Layer 5: Single word — try www.[word].com ───────────
    if (isSingleWord(raw)) {
      return this._open(`https://www.${raw}.com`, desc || raw);
    }

    // ── Layer 6: Fuzzy match against URL map ─────────────────
    const fuzzy = fuzzyFindSite(lower);
    if (fuzzy) {
      return this._open(fuzzy, desc || raw);
    }

    // ── Layer 7: Multi-word slug guess ───────────────────────
    // e.g. "nine anime" → nineAnime.com / nineanime.com / nineanime.to
    const slug = lower.replace(/\s+/g, '');
    const camelSlug = lower.replace(/\s+(\w)/g, (_, c) => c.toUpperCase());
    // Try .com, .io, .to, .co, .net for common slugs
    const guessUrls = [
      `https://www.${slug}.com`,
      `https://www.${slug}.io`,
      `https://www.${slug}.to`,
      `https://www.${slug}.co`,
      `https://www.${slug}.net`,
    ];
    // We open the most likely one (.com) and return success
    return this._open(guessUrls[0], desc || raw);
  }

  // internal open helper
  _open(url, label = '') {
    const opened = throttledOpen(url, label);
    return {
      success: true,
      message: `✅ Opened **${label || url}**`,
      url,
      opened,
    };
  }

  // ── § B  SEARCH ENGINE DISPATCHER ────────────────────────
  search(query, engine = null) {
    if (!query?.trim()) return { success: false, message: 'No query provided.' };
    const eng = (engine || this._defaultSearchEngine).toLowerCase();
    const fn = this.searchEngines[eng] || this.searchEngines.google;
    const url = fn(query);
    throttledOpen(url, `Search: ${query}`);
    return { success: true, message: `🔍 Searching ${eng} for **"${query}"**`, url };
  }

  googleSearch(query)     { return this.search(query, 'google'); }
  bingSearch(query)       { return this.search(query, 'bing'); }
  duckduckgoSearch(query) { return this.search(query, 'duckduckgo'); }
  braveSearch(query)      { return this.search(query, 'brave'); }
  ecosiaSearch(query)     { return this.search(query, 'ecosia'); }
  googleLucky(query)      { return this.search(query, 'google_lucky'); }
  redditSearch(query)     { return this.search(query, 'reddit'); }
  wikipediaSearch(query)  { return this.search(query, 'wikipedia'); }
  npmSearch(query)        { return this.search(query, 'npm'); }
  githubSearch(query)     { return this.search(query, 'github'); }
  stackoverflowSearch(q)  { return this.search(q, 'stackoverflow'); }
  amazonSearch(query)     { return this.search(query, 'amazon'); }

  // ── § C  MEDIA PLATFORM SEARCH / PLAY ────────────────────
  youtubeSearch(query) {
    const url = SEARCH_ENGINES.youtube(query);
    throttledOpen(url, `YouTube: ${query}`);
    return { success: true, message: `▶️ Searching YouTube for **"${query}"**`, url };
  }

  spotifySearch(query) {
    const url = SEARCH_ENGINES.spotify(query);
    throttledOpen(url, `Spotify: ${query}`);
    return { success: true, message: `🎵 Searching Spotify for **"${query}"**`, url };
  }

  youtubeChannel(channel) {
    const url = `https://www.youtube.com/@${channel.replace(/^@/, '')}`;
    return this._open(url, `YouTube @${channel}`);
  }

  youtubePlaylist(id) {
    const url = `https://www.youtube.com/playlist?list=${id}`;
    return this._open(url, `YouTube Playlist`);
  }

  spotifyArtist(name) {
    return this.spotifySearch(name);
  }

  spotifyPlaylist(name) {
    const url = `https://open.spotify.com/search/${encodeURIComponent(name)}/playlists`;
    throttledOpen(url, `Spotify playlist: ${name}`);
    return { success: true, message: `🎶 Opening Spotify playlist search for **"${name}"**`, url };
  }

  appleMusicSearch(query) {
    const url = `https://music.apple.com/search?term=${encodeURIComponent(query)}`;
    throttledOpen(url, `Apple Music: ${query}`);
    return { success: true, message: `🍎 Searching Apple Music for **"${query}"**`, url };
  }

  soundcloudSearch(query) {
    const url = `https://soundcloud.com/search?q=${encodeURIComponent(query)}`;
    throttledOpen(url, `SoundCloud: ${query}`);
    return { success: true, message: `☁️ Searching SoundCloud for **"${query}"**`, url };
  }

  // ── § D  MAPS & DIRECTIONS ────────────────────────────────
  openMaps(location) {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(location)}`;
    throttledOpen(url, `Maps: ${location}`);
    return { success: true, message: `🗺️ Opening Google Maps for **"${location}"**`, url };
  }

  getDirections(from, to) {
    const url = `https://www.google.com/maps/dir/${encodeURIComponent(from)}/${encodeURIComponent(to)}`;
    throttledOpen(url, `Directions: ${from} → ${to}`);
    return { success: true, message: `🧭 Getting directions from **${from}** to **${to}**`, url };
  }

  // ── § E  MULTI-SITE OPENER ────────────────────────────────
  detectMultipleSites(text) {
    if (!/^(open|launch|visit|go to|load|show me|take me to)\s+/i.test(text.trim())) return null;
    const stripped = text.trim()
      .replace(/^(open|launch|visit|go\s+to|load|show\s+me|take\s+me\s+to)\s+/i, '');
    const parts = stripped
      .split(/\s*,\s*|\s+and\s+|\s*&\s*|\s+as\s+well\s+as\s+|\s+along\s+with\s+|\s+\+\s+|\s+then\s+/i)
      .map(p => sanitizeUrl(p))
      .filter(p => p.length > 0 && !/^(me|please|now|for me)$/i.test(p));
    return parts.length >= 2 ? parts : null;
  }

  openMultiple(sites) {
    const delay = 450;
    sites.forEach((site, i) => {
      setTimeout(() => this.openWebsite(site), i * delay);
    });
    return {
      success: true,
      message: `✅ Opening **${sites.length} tabs**: ${sites.join(', ')}`,
      multi: true,
      sites,
    };
  }

  // ── § F  PLATFORM PLAY DETECTION ─────────────────────────
  detectPlatformPlay(text) {
    const lower = text.toLowerCase().trim();

    // "play X on spotify"
    let m = lower.match(/(?:play|listen\s+to|stream|hear|blast|queue|put\s+on)\s+(.+?)\s+on\s+(spotify|youtube|yt|apple\s+music|soundcloud|deezer|tidal)/i);
    if (m) return { platform: m[2].replace('yt','youtube').replace(/\s+/g,''), query: m[1].trim() };

    // "open spotify and play X"
    m = lower.match(/open\s+(spotify|youtube)\s+(?:and|then)\s+(?:play|search|listen\s+to|find)\s+(.+)/i);
    if (m) return { platform: m[1], query: m[2].trim() };

    // "search for X on youtube"
    m = lower.match(/search\s+(?:for\s+)?(.+?)\s+on\s+(spotify|youtube|yt|apple\s+music)/i);
    if (m) return { platform: m[2].replace('yt','youtube'), query: m[1].trim() };

    // bare "play X"
    m = lower.match(/^(?:play|watch)\s+(.+)/i);
    if (m) return { platform: 'youtube', query: m[1].replace(/[?.!]+$/,'').trim() };

    return null;
  }

  // ── § G  INTENT → ACTION DISPATCHER ──────────────────────
  processIntent(intent, entities = {}, rawText = '', slots = {}) {
    const text = rawText?.trim() || '';
    const target = slots.target || entities.target || '';
    const query = slots.query || entities.query || target;

    // Multi-site check first
    const multi = this.detectMultipleSites(text);
    if (multi) return this.openMultiple(multi);

    switch (intent) {
      // ── Navigation ──────────────────────────────────────
      case 'NAVIGATE':
      case 'NAVIGATION':
        return this.openWebsite(target || text.replace(/^(open|go to|visit|launch|navigate to|take me to|show me|load)\s+/i, '').trim());

      // ── Web search ──────────────────────────────────────
      case 'SEARCH_WEB':
      case 'SEARCH':
        return this.googleSearch(query || text);

      // ── YouTube ─────────────────────────────────────────
      case 'SEARCH_YOUTUBE':
      case 'YOUTUBE_SEARCH':
      case 'YOUTUBE':
        return this.youtubeSearch(query || text);

      // ── Media / Music ────────────────────────────────────
      case 'PLATFORM_PLAY':
      case 'PLAY_MUSIC': {
        const platform = (slots.platform || '').toLowerCase();
        const q = slots.query || query;
        if (!q) {
          // No query — just open the platform
          if (platform === 'spotify') return this.openWebsite('spotify');
          if (platform === 'youtube' || platform === 'yt') return this.openWebsite('youtube');
          return this.openWebsite('youtube');
        }
        if (platform === 'spotify') return this.spotifySearch(q);
        if (platform === 'youtube' || platform === 'yt') return this.youtubeSearch(q);
        if (platform === 'applemusic' || platform === 'apple music') return this.appleMusicSearch(q);
        if (platform === 'soundcloud') return this.soundcloudSearch(q);
        // No platform specified — try raw text detection
        const pp = this.detectPlatformPlay(text);
        if (pp) {
          if (pp.platform === 'spotify') return this.spotifySearch(pp.query);
          if (pp.platform === 'soundcloud') return this.soundcloudSearch(pp.query);
          if (pp.platform === 'applemusic') return this.appleMusicSearch(pp.query);
          return this.youtubeSearch(pp.query);
        }
        return this.youtubeSearch(q);
      }

      // ── Maps ─────────────────────────────────────────────
      case 'MAPS':
      case 'MAP':
        return this.openMaps(query || target || text);

      // ── Amazon / Shopping ────────────────────────────────
      case 'SHOPPING':
      case 'BUY':
        return this.amazonSearch(query || text);

      // ── Wikipedia ────────────────────────────────────────
      case 'WIKIPEDIA':
        return this.wikipediaSearch(query || text);

      // ── GitHub search ────────────────────────────────────
      case 'GITHUB_SEARCH':
        return this.githubSearch(query || text);

      // ── Reddit ───────────────────────────────────────────
      case 'REDDIT_SEARCH':
        return this.redditSearch(query || text);

      // ── Translate ────────────────────────────────────────
      case 'TRANSLATE': {
        const tText = slots.text || query;
        const tLang = slots.targetLang || '';
        if (tText && tLang) {
          const url = `https://translate.google.com/?sl=auto&tl=${tLang}&text=${encodeURIComponent(tText)}&op=translate`;
          return this._open(url, `Translate to ${tLang}`);
        }
        return this.openWebsite('translate');
      }

      default: {
        // Last resort: platform play detection on raw text
        const pp = this.detectPlatformPlay(text);
        if (pp) {
          if (pp.platform === 'spotify') return this.spotifySearch(pp.query);
          if (pp.platform === 'soundcloud') return this.soundcloudSearch(pp.query);
          if (pp.platform === 'applemusic') return this.appleMusicSearch(pp.query);
          return this.youtubeSearch(pp.query);
        }
        return null;
      }
    }
  }

  // ── § H  LLM TOOL CALL EXECUTOR ──────────────────────────
  async execute(actionName, params = {}) {
    try {
      switch (actionName) {
        case 'open_website':
          return this.openWebsite(params.url || params.target || params.site || '', params.description || '');
        case 'google_search':
          return this.googleSearch(params.query || params.q || '');
        case 'bing_search':
          return this.bingSearch(params.query || '');
        case 'duckduckgo_search':
          return this.duckduckgoSearch(params.query || '');
        case 'youtube_search':
          return this.youtubeSearch(params.query || '');
        case 'youtube_channel':
          return this.youtubeChannel(params.channel || params.query || '');
        case 'spotify_search':
          return this.spotifySearch(params.query || '');
        case 'spotify_playlist':
          return this.spotifyPlaylist(params.query || '');
        case 'apple_music_search':
          return this.appleMusicSearch(params.query || '');
        case 'soundcloud_search':
          return this.soundcloudSearch(params.query || '');
        case 'open_maps':
          return this.openMaps(params.location || params.query || '');
        case 'get_directions':
          return this.getDirections(params.from || '', params.to || '');
        case 'amazon_search':
          return this.amazonSearch(params.query || '');
        case 'github_search':
          return this.githubSearch(params.query || '');
        case 'wikipedia_search':
          return this.wikipediaSearch(params.query || '');
        case 'reddit_search':
          return this.redditSearch(params.query || '');
        case 'stackoverflow_search':
          return this.stackoverflowSearch(params.query || '');
        case 'npm_search':
          return this.npmSearch(params.query || '');
        case 'open_translate':
          return this.processIntent('TRANSLATE', {}, '', params);
        case 'save_memory':
          await memoryEngine.saveNamedMemory(params.key || '', params.value || '');
          return { success: true, message: `💾 Saved: **${params.key}** = "${params.value}"` };
        case 'open_multiple':
          if (Array.isArray(params.sites)) return this.openMultiple(params.sites);
          return { success: false, message: 'No sites array provided.' };
        case 'social_handle':
          return this._open(resolveHandle(params.handle, params.platform) || '', params.handle);
        case 'set_search_engine':
          if (this.searchEngines[params.engine]) {
            this._defaultSearchEngine = params.engine;
            return { success: true, message: `🔍 Default search engine set to **${params.engine}**` };
          }
          return { success: false, message: `Unknown search engine: ${params.engine}` };
        case 'get_history':
          return { success: true, history: getHistory(), message: '📜 Recent history retrieved.' };
        default:
          return { success: false, message: `Unknown action: ${actionName}` };
      }
    } catch (err) {
      return { success: false, message: `Action failed: ${err.message}` };
    }
  }

  // ── § I  UTILITY GETTERS ──────────────────────────────────
  getSiteUrl(name) {
    const lower = name.toLowerCase().trim();
    return this.urlMap[lower] || fuzzyFindSite(lower) || null;
  }

  getSupportedSites() {
    return Object.keys(this.urlMap);
  }

  getRecentHistory() {
    return getHistory();
  }

  clearHistory() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }

  setDefaultSearchEngine(engine) {
    if (this.searchEngines[engine]) {
      this._defaultSearchEngine = engine;
      return true;
    }
    return false;
  }
}

export const actionEngine = new ActionEngine();
export default ActionEngine;
