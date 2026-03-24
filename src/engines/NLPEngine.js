// ================================================================
// ROSS AI — NLP Engine v6  "Cortex"
// ================================================================
//
//  Full 9-stage pipeline:
//  0  Raw sanitisation
//  1  Preprocessing  (Unicode · Levenshtein spell-fix · contractions · number-words)
//  2  Linguistic     (tokenise · POS · negation · temporal · sentiment)
//  3  Language detection (18 languages)
//  4  Named Entity Recognition (URL/email/date + gazetteer + compromise)
//  5  Semantic vectors (24-cluster word embeddings · cosine similarity)
//  6  Intent classification cascade  (A: patterns · C: semantic · D: q-type · E: implicit)
//  7  Slot filling with typed extraction
//  8  Dialogue management (15-turn state, coreference, ellipsis resolution)
//  9  Confidence calibration (Platt scaling + ensemble)
// ================================================================

// ── SPELL MAP ─────────────────────────────────────────────────
const SPELL_MAP = {
  yotube:'youtube',yutube:'youtube',utube:'youtube',youtub:'youtube',ytube:'youtube',
  githib:'github',gitub:'github',gihub:'github',githup:'github',githhub:'github',
  spotfy:'spotify',spotifi:'spotify',spottify:'spotify',sportify:'spotify',sportfy:'spotify',
  instgram:'instagram',instagrem:'instagram',instagrm:'instagram',insagram:'instagram',
  facbook:'facebook',facebok:'facebook',faceook:'facebook',fcebook:'facebook',
  watsapp:'whatsapp',wahtsapp:'whatsapp',whtasapp:'whatsapp',whatsap:'whatsapp',
  netfix:'netflix',netflex:'netflix',netlfix:'netflix',netflx:'netflix',
  gogle:'google',googel:'google',gooogle:'google',googgle:'google',
  amazn:'amazon',amzon:'amazon',amazone:'amazon',
  twich:'twitch',twicth:'twitch',twicch:'twitch',
  discrod:'discord',discorrd:'discord',discrd:'discord',
  wiipedia:'wikipedia',wikipeida:'wikipedia',wikipdeia:'wikipedia',wikip:'wikipedia',
  linikin:'linkedin',linkdin:'linkedin',linkedln:'linkedin',linkidin:'linkedin',
  redddit:'reddit',reditt:'reddit',reddirt:'reddit',reddot:'reddit',
  tiktoc:'tiktok',ticktok:'tiktok',
  drak:'drake',drke:'drake',draek:'drake',
  emimen:'eminem',eminim:'eminem',eminiem:'eminem',
  recepie:'recipe',recipie:'recipe',recipy:'recipe',
  tomarow:'tomorrow',tommorow:'tomorrow',tomorow:'tomorrow',
  definately:'definitely',defintely:'definitely',defenitely:'definitely',
  seperate:'separate',occured:'occurred',accomodate:'accommodate',
  becuase:'because',untill:'until',enviroment:'environment',
  occassion:'occasion',restaraunt:'restaurant',wierd:'weird',
  recieve:'receive',beleive:'believe',freind:'friend',
  pythong:'python',pyhton:'python',pythno:'python',
  javascirpt:'javascript',javasript:'javascript',javscript:'javascript',
  typscript:'typescript',typscirpt:'typescript',
};

const MULTI_WORD_SPELL = {
  'bally arish':'billie eilish','billi eilish':'billie eilish','billy eilish':'billie eilish',
  'the weekand':'the weeknd','week end':'the weeknd','weakend':'the weeknd',
  'aarijit singh':'arijit singh','arijeet singh':'arijit singh',
  'taylor swifft':'taylor swift','tailor swift':'taylor swift',
  'ed sheran':'ed sheeran','post malon':'post malone','post malonne':'post malone',
  'kanya west':'kanye west','cardi bee':'cardi b',
};

const CONTRACTIONS = {
  "i'm":"i am","i've":"i have","i'll":"i will","i'd":"i would",
  "you're":"you are","you've":"you have","you'll":"you will","you'd":"you would",
  "he's":"he is","she's":"she is","it's":"it is","that's":"that is","there's":"there is",
  "we're":"we are","we've":"we have","we'll":"we will","we'd":"we would",
  "they're":"they are","they've":"they have","they'll":"they will","they'd":"they would",
  "isn't":"is not","aren't":"are not","wasn't":"was not","weren't":"were not",
  "haven't":"have not","hasn't":"has not","hadn't":"had not",
  "won't":"will not","wouldn't":"would not","don't":"do not","doesn't":"does not","didn't":"did not",
  "can't":"cannot","couldn't":"could not","shouldn't":"should not","mustn't":"must not",
  "wanna":"want to","gonna":"going to","gotta":"got to","lemme":"let me","gimme":"give me",
  "kinda":"kind of","sorta":"sort of","dunno":"do not know","lotta":"lot of",
  "y'all":"you all","ain't":"is not","oughta":"ought to",
  "coulda":"could have","woulda":"would have","shoulda":"should have",
  "hafta":"have to","c'mon":"come on",
};

const ABBREVS = {
  asap:'as soon as possible',btw:'by the way',fyi:'for your information',
  lol:'laughing out loud',omg:'oh my god',imo:'in my opinion',
  imho:'in my humble opinion',tbh:'to be honest',ngl:'not going to lie',
  iirc:'if i recall correctly',afaik:'as far as i know',idk:'i do not know',
  nvm:'never mind',rn:'right now',irl:'in real life',
  js:'javascript',ts:'typescript',py:'python',
  db:'database',ui:'user interface',ux:'user experience',
  vs:'versus',
};

const NUMBER_WORDS = {
  zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
  eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,
  eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,
  seventy:70,eighty:80,ninety:90,hundred:100,thousand:1000,million:1000000,
};

// ── PORTER STEMMER (lite) ─────────────────────────────────────
function stem(word) {
  let w = word.toLowerCase();
  if (w.length < 4) return w;
  if (w.endsWith('sses')) w = w.slice(0,-2);
  else if (w.endsWith('ies')) w = w.slice(0,-2);
  else if (!w.endsWith('ss') && w.endsWith('s')) w = w.slice(0,-1);
  if (w.endsWith('eed')) { if (w.length > 4) w = w.slice(0,-1); }
  else if (w.endsWith('ing') && w.length > 5) w = w.slice(0,-3);
  else if (w.endsWith('ed') && w.length > 4) w = w.slice(0,-2);
  const s2=[['ational','ate'],['izer','ize'],['alism','al'],['aliti','al'],
            ['ousli','ous'],['ization','ize'],['ation','ate'],['ator','ate'],
            ['iveness','ive'],['fulness','ful'],['ousness','ous'],['iviti','ive'],['biliti','ble']];
  for (const [suf,rep] of s2) if (w.endsWith(suf)&&w.length>suf.length+2){w=w.slice(0,-suf.length)+rep;break;}
  const s3=[['icate','ic'],['ative',''],['alize','al'],['iciti','ic'],['ical','ic'],['ness','']];
  for (const [suf,rep] of s3) if (w.endsWith(suf)&&w.length>suf.length+2){w=w.slice(0,-suf.length)+rep;break;}
  return w;
}

// ── LEVENSHTEIN ───────────────────────────────────────────────
function levenshtein(a,b) {
  const m=a.length,n=b.length;
  if(m===0)return n;if(n===0)return m;
  if(Math.abs(m-n)>3)return 99;
  const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)
    dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

// ── TOKENISER ─────────────────────────────────────────────────
function tokenize(text) {
  return text
    .replace(/```[\s\S]*?```/g,' __CODE__ ')
    .replace(/`[^`]+`/g,' __INLINE_CODE__ ')
    .replace(/https?:\/\/\S+/g,' __URL__ ')
    .replace(/\b[\w.+-]+@[\w-]+\.\w+\b/g,' __EMAIL__ ')
    .toLowerCase()
    .split(/[\s,;|]+/)
    .map(t=>t.replace(/^[^a-z0-9_]+|[^a-z0-9_]+$/g,''))
    .filter(Boolean);
}

// ── POS MICRO-TAGGER ─────────────────────────────────────────
const POS_RULES=[
  {re:/^(open|launch|go|navigate|visit|load|take|show|pull|bring|start|run|execute|activate|enable|turn)$/i,tag:'VB_ACTION'},
  {re:/^(play|listen|watch|stream|hear|queue|put|tune)$/i,tag:'VB_MEDIA'},
  {re:/^(search|find|look|browse|google|query|fetch|get|retrieve|seek|discover)$/i,tag:'VB_SEARCH'},
  {re:/^(write|create|make|generate|build|draft|compose|code|develop|design|produce|draw|craft|forge)$/i,tag:'VB_CREATE'},
  {re:/^(explain|describe|tell|what|how|why|when|where|who|define|clarify|elaborate|summarize|outline|breakdown)$/i,tag:'VB_INFORM'},
  {re:/^(remember|save|note|keep|store|record|bookmark|log)$/i,tag:'VB_MEMORY'},
  {re:/^(stop|quit|cancel|abort|pause|mute|silence|close|exit|end|halt|kill)$/i,tag:'VB_STOP'},
  {re:/^(translate|convert|switch|change|toggle|transform|render|decode)$/i,tag:'VB_TRANSFORM'},
  {re:/^(is|are|was|were|be|been|being|am)$/i,tag:'VB_COPULA'},
  {re:/^(spotify|youtube|netflix|github|twitter|instagram|facebook|reddit|discord|twitch|amazon|google|gmail|whatsapp|telegram|tiktok|linkedin|pinterest|slack|figma|notion|vercel|openai|anthropic|groq|huggingface|mistral|perplexity|claude)$/i,tag:'NNP_SERVICE'},
  {re:/^(python|javascript|typescript|react|vue|angular|node|rust|go|java|css|html|sql|mongodb|postgresql|redis|docker|kubernetes|git|linux|windows|macos|swift|kotlin|dart|php|ruby|scala)$/i,tag:'NNP_TECH'},
  {re:/\d+/,tag:'CD'},
];
function posTag(tokens){
  return tokens.map(tok=>{
    for(const{re,tag}of POS_RULES)if(re.test(tok))return{tok,tag};
    if(tok.endsWith('ing'))return{tok,tag:'VBG'};
    if(tok.endsWith('ed'))return{tok,tag:'VBD'};
    if(tok.endsWith('ly'))return{tok,tag:'RB'};
    if(tok.endsWith('tion')||tok.endsWith('ness')||tok.endsWith('ment')||tok.endsWith('ity'))return{tok,tag:'NN'};
    return{tok,tag:'NN'};
  });
}

// ── LANGUAGE DETECTION (18 langs) ───────────────────────────
const LANG_LEX={
  es:/\b(hola|cómo|qué|gracias|por|favor|buenos|días|señor|también|porque|cuando|muy|más|hacer|estar|tener|quiero|puedes)\b/i,
  fr:/\b(bonjour|merci|comment|je|vous|est|une|les|des|que|pas|avec|pour|dans|mais|aussi|bien|très|quoi|faire|veux|peux)\b/i,
  de:/\b(hallo|danke|bitte|ich|bin|wie|nein|ja|der|die|das|ist|auf|mit|von|für|und|oder|auch|nicht|sein|haben|können|möchte)\b/i,
  it:/\b(ciao|grazie|prego|come|stai|sono|questa|anche|però|perché|quando|dove|cosa|molto|bene|voglio|puoi|fare)\b/i,
  pt:/\b(olá|obrigado|por|favor|como|você|está|uma|dos|que|para|com|mas|não|também|muito|quero|pode|fazer)\b/i,
  tr:/\b(merhaba|teşekkür|lütfen|nasıl|evet|hayır|tamam|şimdi|çok|iyi|olmak|yapmak|istiyorum|yapabilir)\b/i,
  nl:/\b(hallo|dank|graag|hoe|goed|niet|maar|ook|wel|zijn|hebben|worden|kunnen|wil|wat|heb)\b/i,
  pl:/\b(cześć|dziękuję|proszę|jak|tak|nie|dobrze|jest|się|na|do|ze|po|przez|więc|ale|chcę|możesz)\b/i,
  sv:/\b(hej|tack|snälla|vad|hur|ja|nej|bra|inte|också|men|och|att|det|en|på|för|med|vill|kan)\b/i,
  id:/\b(halo|terima|kasih|tolong|bagaimana|ya|tidak|baik|juga|tapi|atau|dan|yang|ini|itu|dari|untuk|sudah|bisa|mau)\b/i,
  ar:/[\u0600-\u06FF]{3,}/,
  hi:/[\u0900-\u097F]{3,}/,
  zh:/[\u4e00-\u9fff]{2,}/,
  ja:/[\u3040-\u30FF]{2,}/,
  ko:/[\uAC00-\uD7AF]{2,}/,
  ru:/[\u0400-\u04FF]{3,}/,
  he:/[\u0590-\u05FF]{3,}/,
  th:/[\u0E00-\u0E7F]{3,}/,
};
function detectLanguage(text){
  if(!text?.trim())return 'en';
  for(const[lang,re]of Object.entries(LANG_LEX))if(re.test(text))return lang;
  return 'en';
}

// ── SEMANTIC CLUSTERS (24 topics) ───────────────────────────
const SEMANTIC_CLUSTERS={
  NAVIGATE:  new Set(['open','launch','go','visit','load','navigate','access','enter','head','browse','pull','bring','direct','take']),
  PLAY:      new Set(['play','listen','stream','watch','hear','queue','put','tune','start','audio','music','video','song','track','album','playlist','podcast','show','binge']),
  SEARCH:    new Set(['search','find','look','query','google','browse','fetch','seek','discover','explore','hunt','research','locate','identify']),
  CREATE:    new Set(['write','create','make','build','generate','produce','draft','compose','code','develop','design','construct','forge','craft','script','program','architect']),
  EXPLAIN:   new Set(['explain','describe','tell','define','clarify','elaborate','detail','illustrate','outline','teach','educate','inform','show','breakdown','analyse','analyze','unpack']),
  SUMMARIZE: new Set(['summarize','summary','brief','condense','shorten','recap','overview','gist','abstract','digest','compress','nutshell','tldr']),
  COMPARE:   new Set(['compare','versus','vs','difference','better','worse','advantages','disadvantages','pros','cons','contrast','distinguish','weigh','benchmark']),
  TRANSLATE: new Set(['translate','convert','say','interpret','localize','transform','render','decode']),
  CALCULATE: new Set(['calculate','compute','solve','math','evaluate','result','total','sum','subtract','multiply','divide','percent','ratio','figure','arithmetic']),
  WEATHER:   new Set(['weather','temperature','forecast','rain','sunny','cloudy','humidity','wind','storm','snow','heat','cold','climate','precipitation','uv']),
  CODE:      new Set(['code','function','class','script','program','app','api','bug','error','debug','algorithm','syntax','variable','loop','array','object','module','import','export','deploy','test','lint','refactor','async','await','promise','callback','hook','component','endpoint','schema','query']),
  MEMORY:    new Set(['remember','save','note','store','record','keep','forget','remind','recall','memory','memorize','bookmark','log']),
  MODE:      new Set(['mode','switch','change','activate','enable','disable','toggle','turn','set','configure','adjust','setting']),
  JOKE:      new Set(['joke','funny','laugh','humor','pun','riddle','amusing','hilarious','comedy','wit','banter','roast','meme']),
  NEWS:      new Set(['news','latest','today','current','breaking','recent','headline','trending','happening','event','update','story','report','article']),
  RECOMMEND: new Set(['recommend','suggest','best','top','good','great','option','choice','pick','idea','advice','should','ideal','perfect','suitable','favourite']),
  HEALTH:    new Set(['health','doctor','medicine','symptom','disease','pain','exercise','diet','mental','anxiety','stress','therapy','treatment','fitness','calories','vitamins','nutrition','medication','dosage']),
  FINANCE:   new Set(['money','finance','budget','expense','invest','stock','crypto','bitcoin','bank','loan','tax','salary','income','price','cost','bill','pay','revenue','profit']),
  TRAVEL:    new Set(['travel','trip','flight','hotel','ticket','visa','destination','tourism','map','directions','distance','route','airport','passport','itinerary']),
  SHOPPING:  new Set(['buy','shop','purchase','order','cart','checkout','delivery','shipping','discount','offer','review','deal','sale','price']),
  SOCIAL:    new Set(['post','tweet','share','like','follow','comment','message','chat','friend','contact','dm','tag','mention','hashtag','profile','reel','story']),
  GREET:     new Set(['hi','hello','hey','howdy','morning','afternoon','evening','sup','greetings','yo','hiya']),
  STOP:      new Set(['stop','quit','cancel','abort','pause','mute','silence','close','exit','end','finish','done','enough','halt']),
  ACADEMIC:  new Set(['study','learn','research','paper','thesis','exam','university','school','class','homework','project','grade','professor','course','degree','lecture','textbook','curriculum']),
};

const WORD_TO_CLUSTERS=new Map();
for(const[cluster,words]of Object.entries(SEMANTIC_CLUSTERS)){
  for(const w of words){
    if(!WORD_TO_CLUSTERS.has(w))WORD_TO_CLUSTERS.set(w,new Set());
    WORD_TO_CLUSTERS.get(w).add(cluster);
  }
}

function textVector(text){
  const tokens=tokenize(text);
  const vec={};
  for(const tok of tokens){
    const s=stem(tok);
    const clusters=WORD_TO_CLUSTERS.get(tok)||WORD_TO_CLUSTERS.get(s)||new Set();
    for(const c of clusters)vec[c]=(vec[c]||0)+1;
  }
  return vec;
}

function cosineSim(va,vb){
  let dot=0,magA=0,magB=0;
  for(const k of Object.keys(va)){dot+=(va[k]||0)*(vb[k]||0);magA+=va[k]**2;}
  for(const v of Object.values(vb))magB+=v**2;
  return(magA&&magB)?dot/(Math.sqrt(magA)*Math.sqrt(magB)):0;
}

// ── NAMED ENTITY EXTRACTOR ───────────────────────────────────
const COUNTRIES=new Set(['india','usa','uk','china','japan','france','germany','brazil','canada','australia','russia','italy','spain','mexico','south korea','indonesia','turkey','saudi arabia','argentina','south africa','egypt','nigeria','pakistan','bangladesh','vietnam','thailand','philippines','malaysia','ukraine','poland','netherlands','sweden','norway','denmark','finland','switzerland','austria','belgium','portugal','czech republic','romania','hungary','greece','israel','iran','iraq','uae','singapore','new zealand','ireland','scotland','wales','england']);
const CITIES=new Set(['delhi','mumbai','bangalore','hyderabad','chennai','kolkata','pune','ahmedabad','jaipur','surat','london','paris','berlin','tokyo','beijing','shanghai','new york','los angeles','chicago','houston','toronto','sydney','melbourne','dubai','singapore','seoul','jakarta','bangkok','moscow','cairo','lagos','nairobi','cape town','buenos aires','rio','sao paulo','mexico city','rome','madrid','barcelona','amsterdam','brussels','vienna','zurich','stockholm','oslo','copenhagen','helsinki','warsaw','prague','budapest','athens','lisbon','dublin','edinburgh','manchester','birmingham','glasgow','toronto','montreal','vancouver','seattle','boston','miami','atlanta','phoenix','dallas','denver','san francisco','washington','philadelphia','detroit']);

function extractNamedEntities(text,nlpDoc){
  const e={urls:[],emails:[],dates:[],times:[],numbers:[],locations:[],services:[],raw:text};
  e.urls=(text.match(/https?:\/\/[^\s]+/g)||[]);
  e.emails=(text.match(/\b[\w.+-]+@[\w-]+\.\w+\b/g)||[]);
  e.dates=(text.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\b/gi)||[]);
  e.times=(text.match(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b/gi)||[]);
  e.numbers=(text.match(/\b\d+(?:\.\d+)?(?:k|m|b|kb|mb|gb|ms|s|min|h|px|%|°|\$|€|£)?\b/gi)||[]);
  e.hasCode=/```[\s\S]*```|`[^`]+`/.test(text);
  const lower=text.toLowerCase();
  for(const city of CITIES)if(lower.includes(city))e.locations.push(city);
  for(const country of COUNTRIES)if(lower.includes(country))e.locations.push(country);
  const svcRe=/\b(spotify|youtube|netflix|github|twitter|instagram|facebook|reddit|discord|twitch|amazon|google|gmail|whatsapp|telegram|tiktok|linkedin|pinterest|slack|figma|notion|vercel|openai|anthropic|groq|huggingface|mistral|perplexity|claude|copilot)\b/gi;
  e.services=[...new Set((text.match(svcRe)||[]).map(s=>s.toLowerCase()))];
  // Capitalised sequences (likely proper nouns not in gazetteer)
  const capSeq=text.match(/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*)\b/g)||[];
  if(capSeq.length)e.properNouns=capSeq.filter(s=>!STOP_NER_WORDS.has(s.toLowerCase())).slice(0,8);
  if(nlpDoc){
    try{
      const people=nlpDoc.people().out('array'),orgs=nlpDoc.organizations().out('array'),places=nlpDoc.places().out('array'),topics=nlpDoc.topics().out('array');
      if(people.length)e.people=people;
      if(orgs.length)e.organizations=orgs;
      if(places.length)e.places=[...new Set([...e.locations,...places])];
      if(topics.length)e.topics=topics;
    }catch{}
  }
  return e;
}

const STOP_NER_WORDS=new Set(['the','a','an','is','are','was','were','be','been','been','my','your','his','her','its','our','their','this','that','these','those','i','you','he','she','it','we','they','how','what','when','where','why','who','which','do','did','does','will','would','can','could','should','may','might','shall','must','please','just','also','okay','yes','no','not','only','very','well','so','now','here','there']);

// ── TEMPORAL EXPRESSION PARSER ───────────────────────────────
function parseTemporalExpression(text){
  const now=new Date(),t=text.toLowerCase();
  if(/\btoday\b/.test(t))return{type:'date',value:now.toISOString().slice(0,10),relative:'today'};
  if(/\btomorrow\b/.test(t)){const d=new Date(now);d.setDate(d.getDate()+1);return{type:'date',value:d.toISOString().slice(0,10),relative:'tomorrow'};}
  if(/\byesterday\b/.test(t)){const d=new Date(now);d.setDate(d.getDate()-1);return{type:'date',value:d.toISOString().slice(0,10),relative:'yesterday'};}
  const inDays=t.match(/\bin\s+(\d+)\s+days?\b/);
  if(inDays){const d=new Date(now);d.setDate(d.getDate()+parseInt(inDays[1]));return{type:'date',value:d.toISOString().slice(0,10),relative:`in ${inDays[1]} days`};}
  if(/\bnext\s+week\b/.test(t))return{type:'week',relative:'next week'};
  if(/\bthis\s+week\b/.test(t))return{type:'week',relative:'this week'};
  if(/\bnext\s+month\b/.test(t))return{type:'month',relative:'next month'};
  return null;
}

// ── NEGATION SCOPE DETECTOR ───────────────────────────────────
function detectNegationScope(tokens){
  const NEG=new Set(['not','no','never','neither','nor','nothing','nobody','nowhere','none','without','barely','hardly','scarcely','cannot','cant','dont','doesnt','didnt','wont','wouldnt','shouldnt','couldnt','mustnt','isnt','arent','wasnt','werent','havent','hasnt','hadnt']);
  const scopes=[];
  for(let i=0;i<tokens.length;i++)
    if(NEG.has(tokens[i]))scopes.push({position:i,scope:tokens.slice(i,Math.min(i+4,tokens.length))});
  return{hasNegation:scopes.length>0,scopes};
}

// ── QUERY TYPE TAXONOMY ───────────────────────────────────────
function classifyQueryType(text){
  const t=text.trim();
  if(/^(open|launch|go|navigate|visit|load|take\s+me\s+to|show\s+me)\b/i.test(t))return 'navigational';
  if(/^(play|search|buy|order|book|schedule|create|make|write|build|send|post|run|execute)\b/i.test(t))return 'transactional';
  if(/^(hi|hey|hello|thanks|bye|how\s+are|what\s+do\s+you\s+think|talk\s+to\s+me)\b/i.test(t))return 'conversational';
  if(/\b(how\s+to|how\s+do\s+i|how\s+can\s+i|steps\s+to|guide|tutorial|walk\s+me\s+through|teach\s+me)\b/i.test(t))return 'instructional';
  if(/\b(better|worse|vs\.?|versus|compare|difference\s+between|pros\s+and\s+cons|which\s+is)\b/i.test(t))return 'comparative';
  if(/\b(write|compose|generate|create|draw|design|make\s+me|build\s+me|draft)\b/i.test(t))return 'creative';
  if(/\?$/.test(t)||/^(what|who|when|where|why|how|which|is|are|was|were|did|does|do|has|have|had|will|would|can|could|should)\b/i.test(t))return 'informational';
  return 'informational';
}

// ── SENTIMENT ANALYSER ───────────────────────────────────────
const POS_WORDS=new Set(['good','great','awesome','excellent','amazing','wonderful','fantastic','love','happy','joy','brilliant','perfect','beautiful','outstanding','incredible','superb','nice','cool','helpful','useful','clear','fast','simple','easy','fun','exciting','impressive','powerful','smart','clever','effective','efficient','elegant','robust','clean','light','smooth','crisp','vivid','best','top','favourite','enjoy','like','appreciate','thanks','thank','right','correct','true']);
const NEG_WORDS=new Set(['bad','terrible','awful','horrible','hate','stupid','broken','wrong','error','fail','crash','slow','difficult','confusing','ugly','weird','annoying','frustrating','useless','pointless','boring','complex','heavy','messy','dirty','glitchy','laggy','inconsistent','unreliable','insecure','dangerous','risky','toxic','worst','dumb','hate','dislike','trash','garbage','poor','weak','worst','pathetic','lame','terrible']);

function analyzeSentiment(text){
  const tokens=tokenize(text);
  let pos=0,neg=0;
  for(const t of tokens){if(POS_WORDS.has(t))pos++;if(NEG_WORDS.has(t))neg++;}
  const total=tokens.length||1;
  const polarity=(pos-neg)/total;
  let label='neutral';
  if(polarity>0.05)label='positive';
  if(polarity<-0.05)label='negative';
  if(polarity<-0.15)label='very_negative';
  if(polarity>0.15)label='very_positive';
  return{polarity,subjectivity:(pos+neg)/total,label,posCount:pos,negCount:neg};
}

// ── IMPLICIT INTENT RESOLVER ─────────────────────────────────
const IMPLICIT_MAP=[
  {re:/\b(i'?m?\s+hungry|need\s+(food|something\s+to\s+eat)|want\s+to\s+eat|craving)\b/i,intent:'SEARCH',slots:{query:'food delivery near me'},confidence:0.70},
  {re:/\b(i'?m?\s+bored|nothing\s+to\s+do|so\s+bored|entertain\s+me)\b/i,intent:'RECOMMEND',slots:{category:'entertainment'},confidence:0.70},
  {re:/\b(can'?t\s+find|don'?t\s+know\s+where|looking\s+for|trying\s+to\s+find)\b/i,intent:'SEARCH',confidence:0.65},
  {re:/\b(i\s+don'?t\s+understand|confused\s+about|lost\s+on|unclear\s+about|makes\s+no\s+sense)\b/i,intent:'EXPLAIN',confidence:0.75},
  {re:/\b(my\s+(head|stomach|back|chest|throat)\s+(hurt|ache|pain|sore)|feeling\s+(sick|unwell|ill))\b/i,intent:'HEALTH_QUERY',confidence:0.75},
  {re:/\b(i\s+should\s+be\s+working|help\s+me\s+focus|distracted|procrastinating)\b/i,intent:'RECOMMEND',slots:{category:'productivity'},confidence:0.65},
  {re:/\b(what\s+should\s+i\s+(watch|read|listen|play|do)\s+(today|tonight|next|now))\b/i,intent:'RECOMMEND',confidence:0.72},
  {re:/\b(take\s+me\s+somewhere|surprise\s+me|random\s+site|something\s+interesting)\b/i,intent:'NAVIGATION',slots:{target:'random interesting website'},confidence:0.60},
  {re:/\b(i\s+miss\s+|feeling\s+lonely|nobody\s+to\s+talk|need\s+someone\s+to\s+talk)\b/i,intent:'GREETING',confidence:0.60,quickResponse:"I'm here! 😊 What's on your mind? You can always talk to me."},
];
function resolveImplicitIntent(text){
  for(const rule of IMPLICIT_MAP){
    if(rule.re.test(text)){
      return{intent:rule.intent,slots:rule.slots||{},confidence:rule.confidence,implicit:true,quickResponse:rule.quickResponse||null};
    }
  }
  return null;
}

// ── PREPROCESSING PIPELINE ───────────────────────────────────
const CONV_PREFIX_RE=/^(?:(?:hey|ok|okay|hi|yo|ross)[,.]?\s*)?(?:(?:can|could|will|would|may)\s+you\s+(?:please\s+)?|please\s+|(?:i\s+(?:would\s+like|want|need|am\s+trying|am\s+going)\s+to\s+)|(?:could\s+you\s+(?:please\s+)?))?/i;
const FILLER_SUFFIX_RE=/\s*(?:for\s+me|please|right\s+now|now|okay|ok|thanks|thank\s+you|if\s+you\s+can|will\s+you|can\s+you|asap|immediately)[.!?,]*$/i;

function preprocess(raw){
  if(!raw?.trim())return{text:'',original:raw};
  let text=raw.trim();
  const original=text;
  try{text=text.normalize('NFKC');}catch{}
  text=text.replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"');
  // Multi-word spell corrections first
  for(const[typo,fix]of Object.entries(MULTI_WORD_SPELL))
    text=text.replace(new RegExp(typo,'gi'),fix);
  // Abbreviation expansion
  text=text.replace(/\b(\w+)\b/g,w=>ABBREVS[w.toLowerCase()]||w);
  // Token-level spell correction with Levenshtein fallback
  const tokens=text.split(/\s+/);
  const corrected=tokens.map(tok=>{
    const clean=tok.toLowerCase().replace(/[^a-z]/g,'');
    if(clean.length<3)return tok;
    if(SPELL_MAP[clean])return tok.replace(new RegExp(clean,'i'),SPELL_MAP[clean]);
    if(clean.length>=5){
      for(const[typo,fix]of Object.entries(SPELL_MAP)){
        if(typeof typo==='string'&&!typo.includes(' ')&&Math.abs(typo.length-clean.length)<=2&&levenshtein(clean,typo)<=1)
          return tok.replace(new RegExp(clean,'i'),fix);
      }
    }
    return tok;
  });
  text=corrected.join(' ');
  // Contraction expansion
  for(const[c,e]of Object.entries(CONTRACTIONS))
    text=text.replace(new RegExp(`\\b${c.replace(/'/g,"'?")}\\b`,'gi'),e);
  // Number words to digits
  text=text.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)\b/gi,w=>NUMBER_WORDS[w.toLowerCase()]??w);
  text=text.replace(/\s+/g,' ').trim();
  if(text.length<30)text=text.replace(/[?.!,]+$/,'').trim();
  return{text,original,changed:text!==original};
}

// ── MULTI-INTENT DETECTOR ────────────────────────────────────
function detectMultiIntent(text){
  const m=text.match(/^(.{5,}?)\s+(?:and\s+then|then|and\s+also|after\s+that|,\s*(?:and\s+)?(?:then\s+)?(?:also\s+)?)(.{5,})$/i);
  if(m)return[m[1].trim(),m[2].trim()];
  return null;
}

// ── TECHNICAL FINGERPRINT ────────────────────────────────────
function detectTechnicalContent(text){
  const signals={
    hasCode:/```[\s\S]*```|`[^`]+`/.test(text),
    hasMath:/[∑∏∫∂∇≤≥≠±∞√π]/u.test(text)||/\b(?:integral|derivative|matrix|vector|polynomial|equation|theorem|proof|hypothesis)\b/i.test(text),
    hasTech:/\b(?:function|class|const|let|var|import|export|async|await|null|undefined|boolean|string|number|array|object|interface|type|generic|template|pointer|memory|heap|stack|recursion|iteration|exception|try|catch|throw|return|yield|lambda)\b/.test(text),
    hasData:/\b(?:json|xml|yaml|csv|sql|nosql|database|table|query|schema|index|primary\s+key|foreign\s+key|join|aggregate|groupby)\b/i.test(text),
    hasNetwork:/\b(?:http|https|tcp|udp|ip|dns|url|uri|endpoint|request|response|rest|graphql|websocket|grpc|oauth|jwt|cors|ssl|tls|certificate|firewall)\b/i.test(text),
    hasAI:/\b(?:neural|transformer|embedding|backpropagation|gradient|epoch|training|inference|tokenizer|attention|llm|gpt|bert|diffusion|reinforcement|supervised|unsupervised|overfitting|regularization)\b/i.test(text),
  };
  signals.isTechnical=Object.values(signals).filter(Boolean).length>0;
  return signals;
}

// ── DIALOGUE ACT CLASSIFIER ──────────────────────────────────
const DIALOGUE_ACTS={
  GREET:/^(?:hi|hello|hey|howdy|morning|afternoon|evening|sup|greetings)[!?,. ]*$/i,
  FAREWELL:/^(?:bye|goodbye|later|night|ciao|peace)[!?,. ]*$/i,
  THANKS:/^(?:thanks|thank|thx|ty|cheers|appreciate)[^a-z]*$/i,
  CONFIRM:/^(?:yes|yep|yup|sure|absolutely|definitely|correct|right|ok|okay|exactly|affirmative)[!?,. ]*$/i,
  DENY:/^(?:no|nope|nah|not\s+really|never|wrong|incorrect)[!?,. ]*$/i,
  REQUEST:/^(?:can|could|would|will|may|please|i\s+(?:want|need|would\s+like))\b/i,
  COMMAND:/^(?:open|go|play|search|find|write|make|create|stop|start|show|tell|explain|give|help|run|execute|launch|translate|calculate)\b/i,
  QUESTION:/\?$/,
  EXCLAIM:/[!]{1,3}$/,
};
function classifyDialogueAct(text){
  for(const[act,re]of Object.entries(DIALOGUE_ACTS))if(re.test(text.trim()))return act;
  return 'INFORM';
}

// ── INTENT DEFINITIONS (130+) ────────────────────────────────
const INTENTS=[
  // SYSTEM META
  {name:'WAKE',priority:15,complexity:'trivial',group:'system',
   patterns:[/^(?:hey\s+ross|ok\s+ross|ross)[!.]?\s*$/i],
   quickResponse:()=>"Hey! I'm listening. What do you need?"},

  // SOCIAL
  {name:'GREETING',priority:12,complexity:'trivial',group:'social',
   patterns:[
     /^(hi+|hello+|hey+|howdy|yo+|sup|hiya|greetings|salut|ola|salam|namaste|konnichiwa|bonjour|ciao|hola|salaam|ahlan|shalom|merhaba|privyet)[!?.]*$/i,
     /^good\s+(morning|afternoon|evening|night|day)[!?.]*$/i,
     /^what'?s\s+(good|up|new|happening|going\s+on|crackin|poppin)[?!.]*$/i,
     /^how'?s\s+(it\s+going|life|everything|things)[?!.]*$/i,
   ],
   quickResponse:(lang,ctx)=>{
     if(ctx.previousCount>5)return["Still here! 😊 What can I help with?","What's next?"][Math.floor(Math.random()*2)];
     const r={
       en:["Hey! What can I do for you?","Hello! I'm ROSS. What's up?","Hi there! Ready to help. 🚀","Hey! Ask me anything."],
       hi:["नमस्ते! मैं ROSS हूँ। कैसे मदद करूँ?"],ar:["مرحباً! كيف يمكنني مساعدتك؟"],
       ja:["こんにちは！ROSSです。何かお手伝いできますか？"],ko:["안녕하세요! 무엇을 도와드릴까요?"],
       fr:["Bonjour! Comment puis-je vous aider?"],es:["¡Hola! ¿En qué te puedo ayudar?"],
       de:["Hallo! Wie kann ich helfen?"],ru:["Привет! Чем могу помочь?"],
       pt:["Olá! Como posso ajudar?"],it:["Ciao! Come posso aiutarti?"],
     };
     const arr=r[lang]||r.en;return arr[Math.floor(Math.random()*arr.length)];
   }},

  {name:'FAREWELL',priority:12,complexity:'trivial',group:'social',
   patterns:[/^(bye+|goodbye|good\s+bye|see\s+(you|ya)|later|take\s+care|farewell|ciao|adios|hasta|peace(\s+out)?|gotta\s+go|ttyl|good\s+night|night+|hasta\s+luego|au\s+revoir|tschüss|arrivederci)[!?.]*$/i],
   quickResponse:()=>["Goodbye! 👋 Come back anytime!","See you! 🚀 Take care!","Goodbye! I'll be here when you need me.","Later! Always happy to help. 😊"][Math.floor(Math.random()*4)]},

  {name:'THANKS',priority:12,complexity:'trivial',group:'social',
   patterns:[/^(thanks+(\s+(a\s+lot|so\s+much|very\s+much|a\s+ton|a\s+million))?|thank\s+you(\s+(so\s+much|a\s+lot|very\s+much))?|thx|ty|cheers|appreciate\s+(it|that|this|you)|that'?s\s+(great|perfect|awesome|helpful|exactly|what\s+i\s+needed|brilliant|wonderful|amazing)|got\s+it|nice\s+one|sweet|brilliant|wonderful|perfect|exactly|superb|excellent|love\s+it|you'?re\s+the\s+best)[!?.]*$/i],
   quickResponse:()=>["You're welcome! 😊","Happy to help!","Anytime! 🚀","Glad I could help! Ask me anything.","My pleasure! 😄"][Math.floor(Math.random()*5)]},

  {name:'AFFIRMATION',priority:11,complexity:'trivial',group:'social',
   patterns:[/^(yes+|yeah+|yep|yup|sure(\s+thing)?|absolutely|definitely|of\s+course|exactly|correct|right|indeed|ok+ay?|alright|sounds?\s+(good|great|fine|perfect)|affirmative|confirmed|roger|understood|copy\s+that|go\s+ahead|proceed)[!?.]*$/i],
   quickResponse:()=>["Got it! What's next?","Sure! What can I help with?","Okay! Ready. 🚀","Understood! Go on."][Math.floor(Math.random()*4)]},

  {name:'NEGATION_RESPONSE',priority:11,complexity:'trivial',group:'social',
   patterns:[/^(no+|nope|nah|not\s+really|never\s+mind|forget\s+it|that'?s\s+(ok|fine|alright)|it'?s?\s+(ok|fine)|i'?m\s+(ok|fine|good|alright)|nvm|not\s+now|maybe\s+later|cancel\s+that|skip\s+it|disregard\s+that)[!?.]*$/i],
   quickResponse:()=>["No problem! Let me know if you need anything.","Alright, I'm here whenever you're ready.","Sure, just say the word!","No worries! Just ask when you're ready."][Math.floor(Math.random()*4)]},

  {name:'HOW_ARE_YOU',priority:13,complexity:'trivial',group:'social',
   patterns:[
     /^how\s+are\s+you(\s+(doing|feeling|going|today|lately|holding\s+up))?[?.!]*$/i,
     /^you\s+(alright|good|ok|doing\s+well|feeling\s+good)[?!.]*$/i,
     /^how\s+(have\s+you\s+been|are\s+things|is\s+it\s+going)[?!.]*$/i,
   ],
   quickResponse:()=>["Running at full capacity! 🔥 What do you need?","All systems green. What's up? 💚","Excellent! Ready to help. What can I do for you?","Never better! Ask away. 🚀"][Math.floor(Math.random()*4)]},

  // META
  {name:'IDENTITY',priority:11,complexity:'simple',group:'meta',
   patterns:[
     /who\s+are\s+you|what\s+are\s+you|your\s+name|introduce\s+yourself|what('?s|\s+is)\s+ross|are\s+you\s+an?\s+(ai|bot|robot|assistant|llm|gpt|claude|chatgpt|gemini)/i,
     /^(tell\s+me\s+about\s+yourself|about\s+you|about\s+ross|what\s+is\s+ross)[?!.]*$/i,
   ],
   quickResponse:()=>"I'm **ROSS** — your Private AI Operating System 🤖\n\nRunning entirely in your browser via Groq's ultra-fast inference. **Zero servers. Zero tracking. All private.**\n\n🚀 I can open any website, play music on Spotify/YouTube, answer questions in 30+ languages, remember facts about you, analyze files & images, run live JavaScript, and a whole lot more.\n\nWhat would you like to do?"},

  {name:'CAPABILITIES',priority:11,complexity:'simple',group:'meta',
   patterns:[
     /what\s+can\s+you\s+(do|help|assist)|your\s+(features|capabilities|commands|abilities|skills|powers)/i,
     /how\s+(do\s+i\s+use\s+you|can\s+you\s+help|to\s+use\s+ross)/i,
     /what\s+(are\s+you\s+capable\s+of|do\s+you\s+support|languages?).{0,30}(can\s+you|do\s+you)/i,
     /show\s+me\s+what\s+you\s+can|list\s+your\s+(commands?|features?|abilities?|skills?)/i,
     /help\s+me\s+understand\s+what\s+you\s+do|what\s+(?:are\s+your\s+)?(?:all\s+)?(?:commands?|features?)/i,
   ],
   quickResponse:()=>`Here's what I can do — just talk to me naturally:\n\n**🌐 Browser Control** — Open any website, multi-tab, Google/YouTube/Spotify search\n**💬 Smart Conversations** — Questions, explanations, analysis in 30+ languages\n**🧠 Persistent Memory** — Remembers facts about you (fully local, no server)\n**📁 File Intelligence** — Summarize PDFs, read documents, describe images\n**💻 Live Code Sandbox** — Write, run & explain JavaScript in real time\n**🎙️ Voice I/O** — Full STT/TTS with "Hey Ross" wake word\n**🔀 4 AI Modes** — Assistant · Study · Developer · Chill\n**📊 Instant Utilities** — Time, date, math, unit conversion, weather\n**🎨 Creative** — Stories, poems, lyrics, essays, brainstorming\n\nExamples:\n- *"Open GitHub and play Eminem on Spotify"*\n- *"Remember my name is Arjun"*\n- *"Explain quantum computing in simple terms"*`},

  // PLATFORM PLAY (highest action priority)
  {name:'PLATFORM_PLAY',priority:13,complexity:'simple',group:'media',
   patterns:[
     /(?:play|listen\s+to|stream|put\s+on|queue|hear)\s+(.+?)\s+(?:on|in)\s+(spotify|youtube|yt|music|apple\s+music)/i,
     /(?:i\s+(?:want|wanna|would\s+like|need)\s+to\s+)?(?:listen\s+to|watch|play|hear)\s+(.+?)\s+on\s+(spotify|youtube|yt)/i,
     /open\s+(spotify|youtube|yt)\s+(?:and|then)\s+(?:play|listen\s+to|search\s+for|watch|stream)\s+(.+)/i,
     /search\s+(?:for\s+)?(.+?)\s+on\s+(spotify|youtube|yt)/i,
     /(?:put|throw|stick)\s+(.+?)\s+on\s+(spotify|youtube|yt)/i,
     /(?:can\s+you\s+)?(?:blast|crank|bump)\s+(.+?)\s+on\s+(spotify|youtube|yt)/i,
   ],
   slots:['query','platform'],
   extract:(text)=>{
     let m=text.match(/open\s+(spotify|youtube|yt)\s+(?:and|then)\s+(?:play|listen\s+to|search\s+for|watch|stream)\s+(.+)/i);
     if(m)return{platform:m[1].toLowerCase().replace('yt','youtube'),query:m[2].replace(FILLER_SUFFIX_RE,'').trim()};
     m=text.match(/(?:play|listen\s+to|stream|hear|blast|crank|bump)\s+(.+?)\s+(?:on|in)\s+(spotify|youtube|yt)/i);
     if(m)return{query:m[1].trim(),platform:m[2].toLowerCase().replace('yt','youtube')};
     m=text.match(/search\s+(?:for\s+)?(.+?)\s+on\s+(spotify|youtube|yt)/i);
     if(m)return{query:m[1].trim(),platform:m[2].toLowerCase().replace('yt','youtube')};
     return null;
   }},

  {name:'PLAY_MUSIC',priority:10,complexity:'simple',group:'media',
   patterns:[/^(?:play|listen\s+to|stream|put\s+on|blast|crank)\s+(?!.*\s+on\s+(?:spotify|youtube|yt))\S.+/i],
   slots:['query'],
   extract:(text)=>{
     const m=text.match(/^(?:play|listen\s+to|stream|put\s+on|blast|crank)\s+(.+)/i);
     return m?{query:m[1].replace(FILLER_SUFFIX_RE,'').replace(/[?.!]+$/,'').trim()}:null;
   }},

  // NAVIGATION
  {name:'NAVIGATION',priority:9,complexity:'simple',group:'browser',
   patterns:[/^(?:open|launch|go\s+to|navigate\s+to|visit|load|take\s+me\s+to|show\s+me|pull\s+up|bring\s+up|head\s+to|direct\s+me\s+to|take\s+me\s+to)\s+\S.*/i],
   slots:['target'],
   extract:(text)=>{
     const stripped=text.replace(CONV_PREFIX_RE,'');
     const m=stripped.match(/^(?:open|launch|go\s+to|navigate\s+to|visit|load|take\s+me\s+to|show\s+me|pull\s+up|bring\s+up|head\s+to|direct\s+me\s+to)\s+(.+)/i);
     if(!m)return null;
     const target=m[1].replace(FILLER_SUFFIX_RE,'').replace(/\s+(?:website|site|page|app|portal|url|link)$/i,'').replace(/\s+and\s+(?:play|listen|watch|search|find).+$/i,'').replace(/[?.!]+$/,'').trim();
     return{target};
   }},

  {name:'YOUTUBE_SEARCH',priority:10,complexity:'simple',group:'browser',
   patterns:[/(?:search\s+youtube|youtube\s+search|play\s+on\s+youtube|watch\s+on\s+youtube|search\s+on\s+youtube|find\s+on\s+youtube|look\s+up\s+on\s+youtube)\s+(.+)/i],
   slots:['query'],
   extract:(text)=>{
     const m=text.match(/(?:search\s+youtube|youtube\s+search|play\s+on\s+youtube|watch\s+on\s+youtube|search\s+on\s+youtube|find\s+on\s+youtube|look\s+up\s+on\s+youtube)\s+(.+)/i);
     return m?{query:m[1].replace(FILLER_SUFFIX_RE,'').trim()}:null;
   }},

  {name:'SEARCH',priority:8,complexity:'simple',group:'browser',
   patterns:[/^(?:search|google|find|look\s+up|look\s+for|search\s+for|browse\s+for|bing|query|googling)\s+(.+)/i],
   slots:['query'],
   extract:(text)=>{
     const m=text.match(/^(?:search|google|find|look\s+up|look\s+for|search\s+for|browse\s+for|bing|query)\s+(.+)/i);
     return m?{query:m[1].replace(FILLER_SUFFIX_RE,'').replace(/[?.!]+$/,'').trim()}:null;
   }},

  // TIME / DATE
  {name:'TIME',priority:13,complexity:'trivial',group:'utility',
   patterns:[/what('?s|\s+is)\s+(the\s+)?(?:current\s+)?time|what\s+time\s+is\s+it|time\s+(right\s+)?now|tell\s+me\s+the\s+time|current\s+time/i],
   quickResponse:()=>{
     const t=new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
     const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
     return`⏰ **${t}** · ${tz}`;
   }},

  {name:'DATE',priority:13,complexity:'trivial',group:'utility',
   patterns:[/what('?s|\s+is)\s+(today'?s?\s+|the\s+)?date|what\s+day\s+is\s+(it|today)|today'?s?\s+date|what'?s\s+today|current\s+date/i],
   quickResponse:()=>{
     const d=new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
     return`📅 Today is **${d}**`;
   }},

  {name:'DAY_OF_WEEK',priority:12,complexity:'trivial',group:'utility',
   patterns:[/what\s+day\s+(of\s+the\s+week\s+)?is\s+(it\s+)?today|which\s+day\s+is\s+it/i],
   quickResponse:()=>{
     const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
     return`📅 Today is **${days[new Date().getDay()]}**`;
   }},

  // MATH
  {name:'MATH',priority:13,complexity:'trivial',group:'utility',
   patterns:[
     /^[\d\s+\-*/().,^%√π]+$/,
     /^(?:what\s+is\s+|calculate\s+|compute\s+|solve\s+|eval(?:uate)?\s+|what'?s\s+)[\d\s+\-*/().,^%x√π]+[=?]?$/i,
     /^\d+\s*[+\-*/^%]\s*\d+/,
   ],
   quickResponse:(lang,ctx,text)=>{
     try{
       const expr=text.replace(/^(?:what\s+is|what'?s|calculate|compute|solve|eval(?:uate)?|how\s+much\s+is|how\s+many\s+is)\s+/i,'').replace(/[^0-9+\-*/.()% ]/g,'').trim();
       if(!expr)return null;
       // eslint-disable-next-line no-new-func
       const result=Function(`"use strict";return(${expr})`)();
       if(typeof result==='number'&&isFinite(result)){
         const fmt=Number.isInteger(result)?result:parseFloat(result.toFixed(10));
         return`🧮 **${expr.trim()} = ${fmt}**`;
       }
     }catch{}
     return null;
   }},

  // MEMORY
  {name:'MEMORY_SAVE',priority:10,complexity:'simple',group:'memory',
   patterns:[
     /\b(?:remember|don'?t\s+forget|please\s+remember|save|note\s+that|keep\s+in\s+mind|store|record\s+that|jot\s+down|make\s+a\s+note)\b\s+(?:that\s+)?(.{3,})/i,
     /^(?:my|i\s+am|i'?m)\s+(?:name|age|city|location|email|phone|preference|fav(?:ou?rite)?|hobby|job|profession|birthday|address|nationality|hometown)\b.{0,15}(?:is|am|=)\s*\S.+/i,
   ],
   slots:['fact'],
   extract:(text)=>{
     const m=text.match(/(?:remember|don'?t\s+forget|save|note\s+that|keep\s+in\s+mind|store|record\s+that|jot\s+down)\s+(?:that\s+)?(.+)/i)||text.match(/^((?:my|i\s+am|i'?m)\s+.+(?:is|am)\s+.+)/i);
     return m?{fact:m[1].trim()}:null;
   }},

  {name:'MEMORY_RECALL',priority:10,complexity:'simple',group:'memory',
   patterns:[/what\s+did\s+i\s+(ask|say|tell\s+you|mention|type)|recall|my\s+memories|what\s+do\s+you\s+(remember|know\s+about\s+me)|do\s+you\s+remember|what\s+do\s+you\s+know\s+about\s+me|what\s+have\s+i\s+told\s+you/i]},

  {name:'MEMORY_CLEAR',priority:10,complexity:'simple',group:'memory',
   patterns:[/\b(?:clear|delete|erase|wipe|forget|remove)\b.{0,20}\b(?:memories|memory|history|everything|all\s+data|all\s+chats?)\b/i]},

  // MODE SWITCHING
  {name:'MODE_SWITCH',priority:11,complexity:'simple',group:'system',
   patterns:[
     /(?:switch\s+to|enter|use|change\s+to|go\s+to|activate|enable|turn\s+on)\s+(assistant|study|developer|dev|chill|relax|coding)\s*(?:mode)?/i,
     /^(assistant|study|developer|dev|chill|relax)\s+mode$/i,
     /(?:be|act)\s+(more\s+)?(casual|relaxed|technical|professional|friendly|strict|formal|informal|creative|fun)/i,
   ],
   slots:['mode'],
   extract:(text)=>{
     const m=text.match(/\b(assistant|study|developer|dev|chill|relax|coding|casual|technical|professional|strict|formal|informal|creative|fun)\b/i);
     if(!m)return null;
     const map={dev:'developer',relax:'chill',coding:'developer',casual:'chill',technical:'developer',professional:'assistant',strict:'assistant',formal:'assistant',informal:'chill',creative:'chill',fun:'chill'};
     const val=m[1].toLowerCase();
     return{mode:map[val]||val};
   }},

  // VOICE
  {name:'STOP_SPEAKING',priority:14,complexity:'trivial',group:'voice',
   patterns:[/^(?:stop|quiet|silence|shut\s+up|shush|pause|mute|stop\s+(?:talking|speaking|voice|it|reading)|enough|ok\s+stop|that'?s\s+enough|please\s+stop)[!.]*$/i]},

  {name:'REPEAT',priority:11,complexity:'trivial',group:'voice',
   patterns:[/^(?:repeat|say\s+that\s+again|what\s+did\s+you\s+say|come\s+again|pardon|huh|didn'?t\s+(?:get|hear|catch)\s+that|once\s+more|say\s+it\s+again|can\s+you\s+repeat)[?!.]*$/i]},

  // TRANSLATE
  {name:'TRANSLATE',priority:10,complexity:'simple',group:'language',
   patterns:[
     /translate\s+(.+?)\s+(?:to|into)\s+(\w+)/i,
     /(?:how\s+do\s+you\s+say|what\s+is|what'?s)\s+(.+?)\s+in\s+(\w+)/i,
     /say\s+"?(.+?)"?\s+in\s+(\w+)/i,
     /(?:what\s+does|what\s+do)\s+(.+?)\s+mean\s+in\s+(\w+)/i,
   ],
   slots:['text','targetLang'],
   extract:(text)=>{
     const m=text.match(/translate\s+(.+?)\s+(?:to|into)\s+(\w+)/i)||text.match(/(?:how\s+do\s+you\s+say|what\s+is|what'?s)\s+(.+?)\s+in\s+(\w+)/i)||text.match(/say\s+"?(.+?)"?\s+in\s+(\w+)/i);
     return m?{text:m[1].trim(),targetLang:m[2].trim()}:null;
   }},

  // WEATHER
  {name:'WEATHER',priority:11,complexity:'simple',group:'utility',
   patterns:[/\b(?:weather|temperature|temp|forecast|will\s+it\s+rain|is\s+it\s+(?:hot|cold|sunny|cloudy|raining|snowing)|humidity|wind\s+speed|what'?s\s+the\s+weather|how'?s\s+the\s+weather|climate\s+in)\b/i],
   slots:['location'],
   extract:(text)=>{
     const m=text.match(/(?:weather|temperature|forecast)\s+(?:in|at|for)\s+(.+?)(?:\s+today|\s+tomorrow)?[?!.]*$/i)||text.match(/(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:weather|today)/i);
     return{location:m?m[1].trim():'your location'};
   }},

  // CREATIVE
  {name:'JOKE',priority:9,complexity:'simple',group:'creative',
   patterns:[/\b(?:tell\s+(?:me\s+)?a?n?\s*joke|make\s+me\s+laugh|something\s+funny|funny\s+joke|pun|riddle|roast\s+me|humor(?:ous)?|crack\s+(?:a|me\s+a)\s+joke|be\s+funny)\b/i]},

  {name:'STORY',priority:8,complexity:'complex',group:'creative',
   patterns:[/\b(?:tell\s+(?:me\s+)?a\s+story|write\s+(?:a\s+)?(?:short\s+)?story|make\s+up\s+a\s+story|short\s+story|bedtime\s+story|fiction|narrative|tale)\b/i]},

  {name:'POEM',priority:8,complexity:'complex',group:'creative',
   patterns:[/\b(?:write\s+(?:me\s+)?a\s+poem|poem\s+about|haiku|sonnet|rhyme|limerick|verse\s+about|compose\s+(?:a\s+)?poem|poetry\s+about)\b/i]},

  {name:'LYRICS',priority:9,complexity:'moderate',group:'creative',
   patterns:[/\b(?:write\s+(?:song\s+)?lyrics?|create\s+a\s+song|make\s+a\s+song\s+about|song\s+lyrics?\s+(?:for|about)|compose\s+(?:a\s+)?song)\b/i]},

  {name:'ESSAY',priority:7,complexity:'complex',group:'creative',
   patterns:[/\b(?:write\s+(?:an?\s+)?essay|compose\s+(?:an?\s+)?(?:essay|article|report|paper)|draft\s+(?:a\s+)?(?:document|report|paper|article|blog))\b/i]},

  {name:'BRAINSTORM',priority:7,complexity:'moderate',group:'creative',
   patterns:[/\b(?:brainstorm|ideas?\s+for|think\s+of\s+(?:some\s+)?ideas?|suggest\s+ideas?|give\s+me\s+ideas?|creative\s+ideas?|come\s+up\s+with\s+ideas?|ideate|idea\s+generation)\b/i]},

  // KNOWLEDGE
  {name:'EXPLAIN',priority:7,complexity:'complex',group:'knowledge',
   patterns:[
     /^(?:explain|describe|elaborate\s+on|tell\s+me\s+about|what\s+(?:is|are)|how\s+(?:does|do|did)|define|clarify|break\s+down|unpack|walk\s+me\s+through|help\s+me\s+understand)\s+.{3,}/i,
     /^(?:what|who|when|where|why|how)\s+.{5,}\?$/i,
   ],
   slots:['topic'],
   extract:(text)=>{
     const m=text.match(/^(?:explain|describe|elaborate\s+on|tell\s+me\s+about|what\s+(?:is|are)|how\s+(?:does|do|did)|define|clarify|break\s+down|unpack|walk\s+me\s+through|help\s+me\s+understand)\s+(.+)/i);
     return m?{topic:m[1].replace(/[?.!]+$/,'').trim()}:null;
   }},

  {name:'COMPARE',priority:7,complexity:'complex',group:'knowledge',
   patterns:[/\b(?:compare|difference\s+between|vs\.?|versus|which\s+is\s+better|pros\s+and\s+cons|advantages\s+and\s+disadvantages|weigh\s+up|contrast|how\s+does\s+.+differ)\b/i],
   slots:['itemA','itemB']},

  {name:'SUMMARIZE',priority:8,complexity:'moderate',group:'knowledge',
   patterns:[/\b(?:summarize|summary|tl;?dr|brief(?:ly)?|give\s+(?:me\s+)?(?:a\s+)?(?:summary|overview|recap|gist|digest|rundown)|condense|in\s+a\s+nutshell|key\s+points?|main\s+points?)\b/i],
   slots:['content']},

  {name:'NEWS',priority:8,complexity:'moderate',group:'knowledge',
   patterns:[/\b(?:(?:latest|today'?s?|current|breaking|recent)\s+news|what'?s\s+happening|headlines|trending\s+(?:today|now)|what\s+happened\s+(?:today|recently)|news\s+today|today'?s\s+headlines)\b/i]},

  {name:'RECOMMEND',priority:7,complexity:'moderate',group:'knowledge',
   patterns:[/\b(?:recommend|suggest|what\s+should\s+i|best\s+(?:way|option|choice|app|tool|resource)|top\s+\d+|give\s+me\s+(?:some\s+)?(?:suggestions?|recommendations?|ideas?)|what'?s\s+(?:a\s+)?good|any\s+suggestions?|advise\s+me)\b/i],
   slots:['category']},

  // HEALTH
  {name:'HEALTH_QUERY',priority:8,complexity:'moderate',group:'health',
   patterns:[/\b(?:symptoms?|diagnosis|treatment|medicine|doctor|hospital|health|disease|condition|pain|ache|fever|headache|cold|flu|covid|cancer|diabetes|allergy|prescription|dosage|side\s+effects?|mental\s+health|anxiety|depression|therapy|exercise\s+routine|diet|nutrition|calories|vitamins?|bmi|blood\s+pressure|heart\s+rate|sleep)\b/i]},

  // FINANCE
  {name:'FINANCE_QUERY',priority:7,complexity:'moderate',group:'finance',
   patterns:[/\b(?:stock\s+price|crypto\s+price|bitcoin|ethereum|forex|exchange\s+rate|inflation|gdp|market\s+cap|nifty|sensex|nasdaq|dow\s+jones|portfolio|invest(?:ment|ing)?|mutual\s+fund|ipo|dividend|budget|tax\s+(?:rate|return|filing)|compound\s+interest|roi|p\/e\s+ratio)\b/i]},

  // CODE
  {name:'CODE_WRITE',priority:9,complexity:'complex',group:'code',
   patterns:[/\b(?:write|create|generate|build|code|make|develop)\b.{0,20}\b(?:code|function|class|script|program|app|application|component|module|api|endpoint|service|schema|query|hook|middleware|controller|route|model|view|template|algorithm|snippet)\b/i],
   slots:['language','task']},

  {name:'CODE_EXPLAIN',priority:8,complexity:'moderate',group:'code',
   patterns:[/\b(?:explain|describe|what\s+does)\b.{0,30}\b(?:code|function|class|script|program|snippet|this\s+code|algorithm)\b/i]},

  {name:'CODE_FIX',priority:9,complexity:'moderate',group:'code',
   patterns:[/\b(?:fix|debug|correct|solve|find\s+(?:the\s+)?(?:bug|error|issue|problem|mistake)|troubleshoot|why\s+(?:is|does|won'?t)|patch|repair)\b.{0,30}\b(?:code|function|error|bug|issue|this|it)\b/i]},

  {name:'CODE_REVIEW',priority:8,complexity:'complex',group:'code',
   patterns:[/\b(?:review|check|analyse|analyze|critique|improve|optimise|optimize|refactor|clean\s+up|audit)\b.{0,20}\b(?:code|function|class|script|this)\b/i]},

  {name:'CODE_CONVERT',priority:8,complexity:'moderate',group:'code',
   patterns:[/\b(?:convert|port|translate|rewrite|migrate)\b.{0,20}\b(?:code|function|script|this)\b.{0,20}\b(?:to|into|from|in)\b.{0,20}\b(?:python|javascript|typescript|rust|go|java|c\+\+|php|ruby|swift|kotlin|dart|r|scala)\b/i]},

  // PERSONAL
  {name:'SELF_INTRO',priority:10,complexity:'simple',group:'personal',
   patterns:[
     /^(?:my\s+name\s+is|i\s+am\s+called|i\s+go\s+by|call\s+me|i'?m)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
     /^(?:hey[,.]?\s+)?(?:my\s+name\s+is|i\s+am|i'?m)\s+[A-Za-z]+/i,
   ],
   slots:['name'],
   extract:(text)=>{
     const m=text.match(/(?:my\s+name\s+is|i\s+am\s+called|i\s+go\s+by|call\s+me|i'?m\s+called)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i)||text.match(/^(?:hey[,.]?\s+)?(?:my\s+name\s+is|i\s+am|i'?m)\s+([A-Za-z]+)/i);
     return m?{name:m[1].trim()}:null;
   }},

  // FALLBACK
  {name:'QUESTION_GENERAL',priority:5,complexity:'moderate',group:'knowledge',
   patterns:[/^(?:what|who|when|where|why|how|which|is|are|was|were|did|does|do|will|would|can|could|should|has|have|had)\s+.{3,}/i]},
];

// ── INTENT SEMANTIC PROFILES ─────────────────────────────────
const INTENT_PROFILES={
  NAVIGATION:    {NAVIGATE:1.0,STOP:0.1},
  PLAY_MUSIC:    {PLAY:1.0,SOCIAL:0.2},
  PLATFORM_PLAY: {PLAY:1.0,NAVIGATE:0.5},
  SEARCH:        {SEARCH:1.0,EXPLAIN:0.2},
  EXPLAIN:       {EXPLAIN:1.0,CODE:0.2,ACADEMIC:0.3},
  CODE_WRITE:    {CODE:1.0,CREATE:0.8},
  CODE_FIX:      {CODE:1.0},
  CODE_REVIEW:   {CODE:0.8,EXPLAIN:0.4},
  CODE_EXPLAIN:  {CODE:0.9,EXPLAIN:0.7},
  CODE_CONVERT:  {CODE:1.0,TRANSLATE:0.4},
  SUMMARIZE:     {SUMMARIZE:1.0,EXPLAIN:0.4},
  COMPARE:       {COMPARE:1.0,EXPLAIN:0.5,RECOMMEND:0.3},
  TRANSLATE:     {TRANSLATE:1.0},
  WEATHER:       {WEATHER:1.0,TRAVEL:0.3},
  RECOMMEND:     {RECOMMEND:1.0,SHOPPING:0.3},
  NEWS:          {NEWS:1.0},
  JOKE:          {JOKE:1.0},
  STORY:         {CREATE:0.8},
  MEMORY_SAVE:   {MEMORY:1.0},
  HEALTH_QUERY:  {HEALTH:1.0},
  FINANCE_QUERY: {FINANCE:1.0},
  BRAINSTORM:    {CREATE:0.7,RECOMMEND:0.5},
  SHOPPING:      {SHOPPING:1.0,NAVIGATE:0.5},
  ACADEMIC:      {ACADEMIC:1.0,EXPLAIN:0.6},
};

function attentionScore(vec,intentName){
  const profile=INTENT_PROFILES[intentName];
  if(!profile)return 0;
  let score=0,total=0;
  for(const[cluster,weight]of Object.entries(profile)){score+=(vec[cluster]||0)*weight;total+=weight;}
  return total>0?score/total:0;
}

function getBestSemanticMatch(text){
  const vec=textVector(text);
  const scores=Object.keys(INTENT_PROFILES).map(name=>({name,score:attentionScore(vec,name)}));
  scores.sort((a,b)=>b.score-a.score);
  const best=scores[0];
  return best&&best.score>0.12?best:null;
}

// ── CONFIDENCE CALIBRATOR (Platt scaling) ────────────────────
function plattScale(rawScore,a=1.0,b=-0.5){return 1/(1+Math.exp(-(a*rawScore+b)));}
function calibrateConfidence({patternScore,semanticScore,contextScore,negated,multiIntent}){
  let e=patternScore*0.6+semanticScore*0.3+contextScore*0.1;
  if(negated)e*=0.85;
  if(multiIntent)e*=0.9;
  return Math.min(0.99,plattScale(e));
}

// ── COMPLEXITY SCORER (7 levels) ─────────────────────────────
function scoreComplexity(text,intent){
  const TRIVIAL=new Set(['GREETING','FAREWELL','THANKS','AFFIRMATION','NEGATION_RESPONSE','TIME','DATE','DAY_OF_WEEK','STOP_SPEAKING','REPEAT','HOW_ARE_YOU','WAKE']);
  const SIMPLE_I=new Set(['NAVIGATION','SEARCH','PLATFORM_PLAY','PLAY_MUSIC','MEMORY_SAVE','MODE_SWITCH','YOUTUBE_SEARCH','SELF_INTRO','WEATHER','IDENTITY','MEMORY_RECALL','MEMORY_CLEAR']);
  if(TRIVIAL.has(intent))return 'trivial';
  if(SIMPLE_I.has(intent))return 'simple';
  const words=text.split(/\s+/).length;
  const hasTech=/\b(algorithm|architecture|neural|quantum|blockchain|recursion|gradient|transformer|embedding|backpropagation|polymorphism|derivative|integral|eigenvector|cryptography|concurrency|parallelism|microservices|serverless|containerization)\b/i.test(text);
  const hasExplain=/\b(explain|elaborate|describe|analyze|compare|contrast|evaluate|critique|justify|prove|derive|demonstrate|discuss|assess|examine)\b/i.test(text);
  const hasCreate=/\b(write|create|generate|build|develop|design|compose|draft|architect|produce|construct)\b/i.test(text);
  const hasMulti=/\b(and\s+also|as\s+well\s+as|in\s+addition|furthermore|plus|moreover|additionally)\b/i.test(text)&&words>15;
  if(words>60||(hasExplain&&hasTech))return 'heavy';
  if(words>30||(hasExplain&&hasCreate)||hasMulti)return 'complex';
  if(words>15||hasExplain||hasCreate||hasTech)return 'moderate';
  if(words>8||['EXPLAIN','CODE_WRITE','COMPARE','STORY','ESSAY'].includes(intent))return 'moderate';
  return 'simple';
}

// ── ADVANCED CONTEXT ENGINE (15-turn) ───────────────────────
class ContextEngine{
  constructor(size=15){
    this.turns=[];
    this.size=size;
    this.currentTopic=null;
    this.topicHistory=[];
    this.userProfile={};
    this.preferenceSignals={};
    this.sessionStart=Date.now();
    this.intentFrequency={};
  }

  add(turn){
    this.turns.push({...turn,ts:Date.now()});
    if(this.turns.length>this.size)this.turns.shift();
    if(turn.intent&&turn.intent!=='UNKNOWN'){
      this.currentTopic=turn.intent;
      this.topicHistory.push(turn.intent);
      if(this.topicHistory.length>20)this.topicHistory.shift();
      this.intentFrequency[turn.intent]=(this.intentFrequency[turn.intent]||0)+1;
    }
    if(turn.slots?.name)this.userProfile.name=turn.slots.name;
    if(turn.slots?.fact)this._parseFact(turn.slots.fact);
    if(turn.slots?.mode)this.userProfile.preferredMode=turn.slots.mode;
    if(turn.slots?.platform)this.preferenceSignals.platform=turn.slots.platform;
    if(turn.slots?.targetLang)this.preferenceSignals.language=turn.slots.targetLang;
  }

  _parseFact(fact){
    const m=fact.match(/^(?:my\s+)?(\w+)\s+is\s+(.+)/i);
    if(m)this.userProfile[m[1].toLowerCase()]=m[2].trim();
  }

  get last(){return this.turns[this.turns.length-1]||null;}
  get previousCount(){return this.turns.length;}
  get isFollowUp(){return this.last&&(Date.now()-(this.last.ts||0))<120000;}

  getMostFrequentIntent(){
    return Object.entries(this.intentFrequency).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  }

  predictNextIntent(){
    const last=this.last?.intent;
    const p={
      NAVIGATION:['SEARCH','PLATFORM_PLAY','NAVIGATION'],
      SEARCH:['EXPLAIN','NAVIGATION','SEARCH'],
      EXPLAIN:['COMPARE','EXPLAIN','SUMMARIZE','BRAINSTORM'],
      CODE_WRITE:['CODE_FIX','CODE_EXPLAIN','CODE_REVIEW','CODE_CONVERT'],
      CODE_FIX:['CODE_WRITE','CODE_EXPLAIN','CODE_REVIEW'],
      GREETING:['CAPABILITIES','IDENTITY','EXPLAIN','HOW_ARE_YOU'],
      WEATHER:['NAVIGATION','RECOMMEND','TRAVEL'],
      NEWS:['EXPLAIN','SEARCH','COMPARE'],
      COMPARE:['RECOMMEND','EXPLAIN'],
      RECOMMEND:['NAVIGATION','SEARCH','EXPLAIN'],
    };
    return p[last]||[];
  }

  clarificationScore(intent,slots,confidence){
    if(confidence<0.45)return 0.8;
    if(intent==='SEARCH'&&!slots.query)return 0.7;
    if(intent==='PLATFORM_PLAY'&&!slots.query)return 0.6;
    if(intent==='TRANSLATE'&&(!slots.text||!slots.targetLang))return 0.65;
    return 0;
  }

  // Advanced coreference + ellipsis resolution
  resolveReferences(text){
    let resolved=text;
    // Pronoun resolution for action verbs
    const pronounMatch=text.match(/^(open|play|search|find|launch|stream|watch|listen\s+to|navigate\s+to|go\s+to)\s+(it|that|this|the\s+same|the\s+one\s+you\s+mentioned|the\s+last\s+one)\b/i);
    if(pronounMatch&&this.last?.entities?.target)
      resolved=text.replace(/\b(it|that|this|the\s+same|the\s+one\s+you\s+mentioned|the\s+last\s+one)\b/i,this.last.entities.target);
    // Redo / repeat
    if(/^(?:do\s+it\s+again|repeat\s+that|once\s+more|again)\b/i.test(text)&&this.last?.text)
      return this.last.text;
    // Contextual continuation: "and also X", "what about X"
    if(/^(?:and\s+also|what\s+about|how\s+about|also|and\s+)\s*/i.test(text)&&this.last?.intent){
      const stripped=text.replace(/^(?:and\s+also|what\s+about|how\s+about|also|and)\s+/i,'');
      if(this.last.intent==='NAVIGATION')return`open ${stripped}`;
      if(this.last.intent==='SEARCH')return`search for ${stripped}`;
      if(this.last.intent==='PLATFORM_PLAY'){
        const plat=this.preferenceSignals.platform||this.last.slots?.platform||'youtube';
        return`play ${stripped} on ${plat}`;
      }
      if(this.last.intent==='EXPLAIN')return`explain ${stripped}`;
      if(this.last.intent==='COMPARE')return`compare ${stripped}`;
    }
    // Elaboration requests
    if(/^(?:more|tell\s+me\s+more|expand\s+on\s+that|go\s+deeper|elaborate|continue|keep\s+going|and\s+then\??\s*$)\b/i.test(text)&&this.last?.slots?.topic)
      return`explain more about ${this.last.slots.topic}`;
    // "same but for X"
    if(/^same\s+(but\s+for|for)\s+(.+)$/i.test(text)&&this.last?.intent){
      const m=text.match(/^same\s+(?:but\s+for|for)\s+(.+)$/i);
      if(m){
        if(this.last.intent==='EXPLAIN')return`explain ${m[1]}`;
        if(this.last.intent==='CODE_WRITE')return`write code for ${m[1]}`;
      }
    }
    return resolved;
  }

  buildContext(){
    return{
      previousCount:this.previousCount,
      isFollowUp:this.isFollowUp,
      currentTopic:this.currentTopic,
      topicHistory:this.topicHistory.slice(-5),
      userProfile:this.userProfile,
      preferenceSignals:this.preferenceSignals,
      lastIntent:this.last?.intent,
      lastEntities:this.last?.entities,
      lastSlots:this.last?.slots,
      predictedNextIntents:this.predictNextIntent(),
      mostFrequentIntent:this.getMostFrequentIntent(),
      intentFrequency:this.intentFrequency,
    };
  }
}

// ── MAIN NLP ENGINE (Cortex v6) ──────────────────────────────
class NLPEngine{
  constructor(){
    this.nlp=null;
    this.initialized=false;
    this.context=new ContextEngine(15);
    this.intents=INTENTS;
    this._apiKey=null;
    this._cache=new Map();
    this._cacheMaxSize=200;
  }

  setApiKey(key){this._apiKey=key;}

  async init(){
    if(this.initialized)return;
    try{const mod=await import('compromise');this.nlp=mod.default;}
    catch{console.warn('[Cortex NLP v6] compromise unavailable — rule-based NER only');}
    this.initialized=true;
    console.info('[Cortex NLP v6 — ROSS] Online. All 9 stages active.');
  }

  _cacheGet(k){return this._cache.get(k)||null;}
  _cacheSet(k,v){
    if(this._cache.size>=this._cacheMaxSize)this._cache.delete(this._cache.keys().next().value);
    this._cache.set(k,v);
  }

  async classify(rawText){
    if(!this.initialized)await this.init();
    if(!rawText?.trim())return this._emptyResult(rawText);

    const cacheKey=rawText.trim().toLowerCase().slice(0,80);
    if(rawText.length<60){
      const cached=this._cacheGet(cacheKey);
      if(cached){this.context.add(cached);return cached;}
    }

    // Stage 0-1: Sanitise + Preprocess
    const{text:preprocessed,original}=preprocess(rawText.trim());

    // Stage 8: Context/coreference resolution
    const resolved=this.context.resolveReferences(preprocessed);

    // Stage 2: Linguistic analysis
    const language=detectLanguage(resolved);
    const tokens=tokenize(resolved);
    const pos=posTag(tokens);
    const negation=detectNegationScope(tokens);
    const sentiment=analyzeSentiment(resolved);
    const queryType=classifyQueryType(resolved);
    const dialogueAct=classifyDialogueAct(resolved);
    const multiIntent=detectMultiIntent(resolved);
    const technicalContent=detectTechnicalContent(resolved);
    const temporal=parseTemporalExpression(resolved);
    const ctx=this.context.buildContext();

    // Stage 4: NER
    let nlpDoc=null;
    try{if(this.nlp)nlpDoc=this.nlp(resolved);}catch{}
    const entities=extractNamedEntities(original,nlpDoc);

    const result={
      intent:'UNKNOWN',group:'unknown',entities,slots:{},complexity:'moderate',
      confidence:0,quickResponse:null,language,tokens,pos,negation,sentiment,
      queryType,dialogueAct,multiIntent,technicalContent,temporal,
      preprocessed:preprocessed!==rawText.trim()?preprocessed:null,
      resolved:resolved!==preprocessed?resolved:null,
      implicit:false,clarificationScore:0,
      predictedNextIntents:ctx.predictedNextIntents,ctx,raw:rawText,_stages:{},
    };

    // ── Stage 6A: High-priority pattern matching ────────────
    const sorted=[...this.intents].sort((a,b)=>(b.priority||5)-(a.priority||5));
    for(const def of sorted){
      let matched=false;
      for(const pattern of(def.patterns||[]))if(pattern.test(resolved)){matched=true;break;}
      if(!matched)continue;

      result.intent=def.name;
      result.group=def.group||'general';
      result._stages.stageA=true;

      // Quick response injection
      if(def.quickResponse){const qr=def.quickResponse(language,ctx,resolved);if(qr)result.quickResponse=qr;}

      // Stage 7: Slot extraction
      if(def.extract){
        const slots=def.extract(resolved);
        if(slots){
          result.slots=slots;
          result.entities.target=slots.target||slots.query||slots.mode||slots.fact||slots.topic||slots.name||null;
        }
      }

      // Deep compromise NER for knowledge/code intents
      if(['EXPLAIN','COMPARE','CODE_WRITE','CODE_FIX','CODE_REVIEW','TRANSLATE','RECOMMEND','HEALTH_QUERY','FINANCE_QUERY','BRAINSTORM','NEWS'].includes(def.name)&&nlpDoc){
        try{
          const p=nlpDoc.people().out('array'),o=nlpDoc.organizations().out('array');
          const pl=nlpDoc.places().out('array'),top=nlpDoc.topics().out('array');
          if(p.length)result.entities.people=p;
          if(o.length)result.entities.organizations=o;
          if(pl.length)result.entities.places=[...new Set([...(result.entities.locations||[]),...pl])];
          if(top.length)result.entities.topics=top;
        }catch{}
      }

      result.confidence=calibrateConfidence({
        patternScore:0.95,semanticScore:0.5,
        contextScore:ctx.isFollowUp?0.8:0.5,
        negated:negation.hasNegation,multiIntent:!!multiIntent,
      });
      result.complexity=def.complexity||scoreComplexity(resolved,def.name);
      result.clarificationScore=this.context.clarificationScore(result.intent,result.slots,result.confidence);
      this.context.add({...result,text:resolved});
      if(rawText.length<60)this._cacheSet(cacheKey,result);
      return result;
    }

    // ── Stage 6C: Semantic attention scoring ────────────────
    const semanticMatch=getBestSemanticMatch(resolved);
    if(semanticMatch&&semanticMatch.score>0.15){
      result._stages.stageC={match:semanticMatch.name,score:semanticMatch.score};
      result.intent=semanticMatch.name;
      result.group=INTENTS.find(d=>d.name===semanticMatch.name)?.group||'general';
      result.confidence=calibrateConfidence({
        patternScore:0,semanticScore:semanticMatch.score,
        contextScore:ctx.isFollowUp&&ctx.lastIntent===semanticMatch.name?0.9:0.5,
        negated:negation.hasNegation,multiIntent:!!multiIntent,
      });
      result.complexity=scoreComplexity(resolved,result.intent);
      const def=INTENTS.find(d=>d.name===result.intent);
      if(def?.quickResponse){const qr=def.quickResponse(language,ctx,resolved);if(qr)result.quickResponse=qr;}
      if(def?.extract){const s=def.extract(resolved);if(s){result.slots=s;result.entities.target=s.target||s.query;}}
    }

    // ── Stage 6D: Question-type inference ───────────────────
    if(result.intent==='UNKNOWN'&&queryType==='informational'){
      result._stages.stageD=true;
      result.intent='EXPLAIN';
      result.complexity=scoreComplexity(resolved,'EXPLAIN');
      result.confidence=0.45;
    }

    // ── Stage 6E: Implicit intent resolver ──────────────────
    if(result.intent==='UNKNOWN'||result.confidence<0.3){
      const implicit=resolveImplicitIntent(resolved);
      if(implicit){
        result._stages.stageE=true;
        result.intent=implicit.intent;
        result.slots={...result.slots,...implicit.slots};
        result.confidence=implicit.confidence;
        result.implicit=true;
        if(implicit.quickResponse)result.quickResponse=implicit.quickResponse;
        result.complexity=scoreComplexity(resolved,result.intent);
      }
    }

    // Context-based confidence boost
    if(ctx.predictedNextIntents.includes(result.intent)){
      result.confidence=Math.min(0.95,result.confidence+0.08);
      result._stages.contextBoost=true;
    }

    // Final entity enrichment for unknowns
    if((result.intent==='UNKNOWN'||result.confidence<0.4)&&nlpDoc){
      try{
        const n=nlpDoc.nouns().out('array'),v=nlpDoc.verbs().out('array'),a=nlpDoc.adjectives().out('array');
        if(n.length)result.entities.nouns=n.slice(0,8);
        if(v.length)result.entities.verbs=v.slice(0,5);
        if(a.length)result.entities.adjectives=a.slice(0,5);
      }catch{}
      result.complexity=scoreComplexity(resolved,'UNKNOWN');
      result.confidence=0.2;
    }

    result.clarificationScore=this.context.clarificationScore(result.intent,result.slots,result.confidence);
    this.context.add({...result,text:resolved});
    if(rawText.length<60)this._cacheSet(cacheKey,result);
    return result;
  }

  _emptyResult(raw){
    return{
      intent:'UNKNOWN',group:'unknown',entities:{},slots:{},complexity:'simple',confidence:0,
      quickResponse:null,language:'en',tokens:[],pos:[],negation:{hasNegation:false,scopes:[]},
      sentiment:{polarity:0,subjectivity:0,label:'neutral'},queryType:'informational',
      dialogueAct:'INFORM',multiIntent:null,technicalContent:{isTechnical:false},temporal:null,
      implicit:false,clarificationScore:0,predictedNextIntents:[],
      ctx:this.context.buildContext(),raw,_stages:{},
    };
  }

  getEmotionStyle(emotion){
    return({
      happy:'upbeat and enthusiastic 😄',sad:'gentle, warm, and empathetic',
      frustrated:'calm, patient, and solution-focused',anxious:'reassuring, structured, and calming',
      excited:'energetic, lively, and engaging',curious:'thoughtful, exploratory, and detailed',
      angry:'very calm, de-escalating, and empathetic',lonely:'warm, compassionate, and present',
    })[emotion]||'helpful, clear, and warm';
  }

  // Debug utility
  async debug(text){
    const r=await this.classify(text);
    console.group(`[Cortex NLP v6] "${text}"`);
    console.log(`  Intent:         ${r.intent} [${r.group}]  conf=${(r.confidence*100).toFixed(1)}%`);
    console.log(`  Complexity:     ${r.complexity}`);
    console.log(`  Query type:     ${r.queryType}`);
    console.log(`  Dialogue act:   ${r.dialogueAct}`);
    console.log(`  Language:       ${r.language}`);
    console.log(`  Negated:        ${r.negation.hasNegation}`);
    console.log(`  Sentiment:      ${r.sentiment.label} (polarity=${r.sentiment.polarity.toFixed(2)})`);
    console.log(`  Technical:      ${r.technicalContent.isTechnical}`);
    console.log(`  Implicit:       ${r.implicit}`);
    console.log(`  Clarification:  ${(r.clarificationScore*100).toFixed(0)}% needed`);
    console.log(`  Stages hit:     ${JSON.stringify(r._stages)}`);
    console.log(`  Slots:         `,r.slots);
    console.log(`  Entities:      `,r.entities);
    console.log(`  Temporal:      `,r.temporal);
    console.log(`  Predicted next:`,r.predictedNextIntents);
    console.log(`  Preprocessed:   ${r.preprocessed||'(unchanged)'}`);
    console.log(`  Resolved:       ${r.resolved||'(unchanged)'}`);
    console.groupEnd();
    return r;
  }

  cacheStats(){return{size:this._cache.size,maxSize:this._cacheMaxSize};}
  clearCache(){this._cache.clear();}
}

export const nlpEngine=new NLPEngine();
export default NLPEngine;
