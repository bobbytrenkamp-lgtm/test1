/* AI Stocks Tab — TradingView-powered AI company tracker */

/* ─────────────────────────────────────────────────────────────── */
/* Company universe                                                  */
/* ─────────────────────────────────────────────────────────────── */

const AI_COMPANIES = [
  // Compute & Semiconductors
  { ticker: 'NASDAQ:NVDA',  symbol: 'NVDA',  name: 'NVIDIA',               shortName: 'NVIDIA',        category: 'Compute & Semiconductors', description: 'Leading GPU maker powering AI training and inference at scale. H100/H200/Blackwell chips dominate AI data centers globally.' },
  { ticker: 'NASDAQ:AMD',   symbol: 'AMD',   name: 'Advanced Micro Devices', shortName: 'AMD',          category: 'Compute & Semiconductors', description: 'GPU and CPU rival with MI300X AI accelerators gaining enterprise traction, competing directly with NVIDIA.' },
  { ticker: 'NASDAQ:INTC',  symbol: 'INTC',  name: 'Intel',                shortName: 'Intel',          category: 'Compute & Semiconductors', description: 'Legacy chip giant pivoting to AI with Gaudi accelerators, Foundry services, and edge AI products.' },
  { ticker: 'NASDAQ:AVGO',  symbol: 'AVGO',  name: 'Broadcom',             shortName: 'Broadcom',       category: 'Compute & Semiconductors', description: 'Networking chips and custom AI ASICs (XPUs) for Google, Meta, and Apple cloud deployments.' },
  { ticker: 'NASDAQ:QCOM',  symbol: 'QCOM',  name: 'Qualcomm',             shortName: 'Qualcomm',       category: 'Compute & Semiconductors', description: 'On-device AI processing with Snapdragon platform for mobile and automotive applications.' },
  { ticker: 'NASDAQ:ARM',   symbol: 'ARM',   name: 'Arm Holdings',         shortName: 'Arm',            category: 'Compute & Semiconductors', description: 'CPU architecture IP used in virtually all mobile and edge AI inference chips worldwide.' },
  { ticker: 'NASDAQ:MRVL',  symbol: 'MRVL',  name: 'Marvell Technology',   shortName: 'Marvell',        category: 'Compute & Semiconductors', description: 'Data infrastructure chips and custom AI ASIC design for hyperscaler cloud deployments.' },
  { ticker: 'NASDAQ:SMCI',  symbol: 'SMCI',  name: 'Super Micro Computer', shortName: 'SuperMicro',     category: 'Compute & Semiconductors', description: 'High-density GPU servers and AI rack systems; major supply partner for NVIDIA deployments.' },
  { ticker: 'NYSE:TSM',     symbol: 'TSM',   name: 'Taiwan Semiconductor', shortName: 'TSMC',           category: 'Compute & Semiconductors', description: "World's largest contract chipmaker manufacturing NVIDIA, AMD, and Apple AI chips." },
  { ticker: 'NASDAQ:ASML',  symbol: 'ASML',  name: 'ASML Holding',         shortName: 'ASML',           category: 'Compute & Semiconductors', description: 'Sole maker of EUV lithography machines essential for producing advanced AI chips.' },
  { ticker: 'NASDAQ:LRCX',  symbol: 'LRCX',  name: 'Lam Research',         shortName: 'Lam Research',   category: 'Compute & Semiconductors', description: 'Semiconductor etch and deposition equipment critical to manufacturing advanced AI chips.' },
  { ticker: 'NASDAQ:AMAT',  symbol: 'AMAT',  name: 'Applied Materials',    shortName: 'Applied Matls',  category: 'Compute & Semiconductors', description: 'Largest semiconductor equipment company; critical tools for AI chip fabs worldwide.' },
  { ticker: 'NASDAQ:TXN',   symbol: 'TXN',   name: 'Texas Instruments',    shortName: 'Texas Instrs',   category: 'Compute & Semiconductors', description: 'Analog and embedded chips for industrial AI, robotics, and automotive applications.' },
  { ticker: 'NASDAQ:NXPI',  symbol: 'NXPI',  name: 'NXP Semiconductors',   shortName: 'NXP Semi',       category: 'Compute & Semiconductors', description: 'Automotive and edge AI processors with a strong position in ADAS and autonomous vehicle compute.' },

  // Cloud & Hyperscalers
  { ticker: 'NASDAQ:MSFT',  symbol: 'MSFT',  name: 'Microsoft',            shortName: 'Microsoft',      category: 'Cloud & Hyperscalers', description: 'Azure AI platform and deep OpenAI partnership; Copilot embedded across Office, GitHub, and Windows.' },
  { ticker: 'NASDAQ:GOOGL', symbol: 'GOOGL', name: 'Alphabet',             shortName: 'Alphabet',       category: 'Cloud & Hyperscalers', description: 'Google Cloud AI, Gemini frontier models, DeepMind research, and Waymo autonomous vehicles.' },
  { ticker: 'NASDAQ:AMZN',  symbol: 'AMZN',  name: 'Amazon',               shortName: 'Amazon',         category: 'Cloud & Hyperscalers', description: 'AWS Bedrock AI platform, custom Trainium/Inferentia chips, Alexa+, and Anthropic investment.' },
  { ticker: 'NASDAQ:META',  symbol: 'META',  name: 'Meta Platforms',       shortName: 'Meta',           category: 'Cloud & Hyperscalers', description: 'Open-source Llama models, Meta AI assistant, and massive GPU infrastructure expansion.' },
  { ticker: 'NYSE:ORCL',    symbol: 'ORCL',  name: 'Oracle',               shortName: 'Oracle',         category: 'Cloud & Hyperscalers', description: 'OCI cloud for AI workloads, AI in Oracle Database, and Stargate data center partnership.' },
  { ticker: 'NYSE:IBM',     symbol: 'IBM',   name: 'IBM',                  shortName: 'IBM',            category: 'Cloud & Hyperscalers', description: 'Watson AI and Granite open models for enterprise; hybrid cloud AI deployment platform.' },

  // AI Software & Platforms
  { ticker: 'NYSE:PLTR',    symbol: 'PLTR',  name: 'Palantir',             shortName: 'Palantir',       category: 'AI Software & Platforms', description: 'AI-powered data analytics for government and enterprise with the Artificial Intelligence Platform (AIP).' },
  { ticker: 'NYSE:AI',      symbol: 'AI',    name: 'C3.ai',                shortName: 'C3.ai',          category: 'AI Software & Platforms', description: 'Enterprise AI application platform with vertical-specific AI solutions across industries.' },
  { ticker: 'NYSE:PATH',    symbol: 'PATH',  name: 'UiPath',               shortName: 'UiPath',         category: 'AI Software & Platforms', description: 'AI-powered robotic process automation (RPA) leader for enterprise workflow automation.' },
  { ticker: 'NYSE:SNOW',    symbol: 'SNOW',  name: 'Snowflake',            shortName: 'Snowflake',      category: 'AI Software & Platforms', description: 'Data cloud platform with Snowpark ML, Cortex AI, and AI-powered data products.' },
  { ticker: 'NASDAQ:DDOG',  symbol: 'DDOG',  name: 'Datadog',              shortName: 'Datadog',        category: 'AI Software & Platforms', description: 'Observability platform with AI monitoring, LLM observability, and Bits AI assistant.' },
  { ticker: 'NASDAQ:SOUN',  symbol: 'SOUN',  name: 'SoundHound AI',        shortName: 'SoundHound',     category: 'AI Software & Platforms', description: 'Voice AI and conversational interfaces for automotive, restaurants, and enterprise.' },

  // Enterprise AI
  { ticker: 'NYSE:CRM',     symbol: 'CRM',   name: 'Salesforce',           shortName: 'Salesforce',     category: 'Enterprise AI', description: 'Agentforce AI for sales and service automation; Einstein AI across all CRM products.' },
  { ticker: 'NASDAQ:ADBE',  symbol: 'ADBE',  name: 'Adobe',                shortName: 'Adobe',          category: 'Enterprise AI', description: 'Firefly generative AI for creative tools; Sensei AI across Document Cloud products.' },
  { ticker: 'NYSE:NOW',     symbol: 'NOW',   name: 'ServiceNow',           shortName: 'ServiceNow',     category: 'Enterprise AI', description: 'Now Assist AI agents for IT service management and enterprise workflow automation.' },
  { ticker: 'NASDAQ:WDAY',  symbol: 'WDAY',  name: 'Workday',              shortName: 'Workday',        category: 'Enterprise AI', description: 'AI-native HCM and financial management; Workday AI-powered co-pilot assistant.' },
  { ticker: 'NYSE:VEEV',    symbol: 'VEEV',  name: 'Veeva Systems',        shortName: 'Veeva',          category: 'Enterprise AI', description: 'AI cloud for life sciences; Vault AI and CRM AI for pharma R&D and commercial.' },

  // Networking & Infrastructure
  { ticker: 'NYSE:ANET',    symbol: 'ANET',  name: 'Arista Networks',      shortName: 'Arista',         category: 'Networking & Infrastructure', description: 'High-speed data center networking for AI clusters; CloudVision network management.' },
  { ticker: 'NASDAQ:CDNS',  symbol: 'CDNS',  name: 'Cadence Design Systems', shortName: 'Cadence',      category: 'Networking & Infrastructure', description: 'EDA software and JedAI platform for AI-assisted design of next-generation AI chips.' },
  { ticker: 'NASDAQ:SNPS',  symbol: 'SNPS',  name: 'Synopsys',             shortName: 'Synopsys',       category: 'Networking & Infrastructure', description: 'EDA tools, IP, and software integrity; essential to designing advanced AI semiconductors.' },

  // Cybersecurity AI
  { ticker: 'NASDAQ:CRWD',  symbol: 'CRWD',  name: 'CrowdStrike',          shortName: 'CrowdStrike',    category: 'Cybersecurity AI', description: 'AI-native endpoint security with Charlotte AI analyst and the Falcon platform.' },
  { ticker: 'NASDAQ:PANW',  symbol: 'PANW',  name: 'Palo Alto Networks',   shortName: 'Palo Alto',      category: 'Cybersecurity AI', description: 'Precision AI across network, cloud, and SOC; Cortex XSIAM AI operations platform.' },
  { ticker: 'NYSE:S',       symbol: 'S',     name: 'SentinelOne',          shortName: 'SentinelOne',    category: 'Cybersecurity AI', description: 'AI-powered endpoint and cloud security with Purple AI analyst assistant.' },
  { ticker: 'NASDAQ:OKTA',  symbol: 'OKTA',  name: 'Okta',                 shortName: 'Okta',           category: 'Cybersecurity AI', description: 'Identity platform with AI-driven threat detection and adaptive access management.' },

  // Robotics & Autonomous
  { ticker: 'NASDAQ:TSLA',  symbol: 'TSLA',  name: 'Tesla',                shortName: 'Tesla',          category: 'Robotics & Autonomous', description: 'Full Self-Driving AI, Optimus humanoid robot, and Dojo supercomputer for AI training.' },
  { ticker: 'NASDAQ:ISRG',  symbol: 'ISRG',  name: 'Intuitive Surgical',   shortName: 'Intuitive',      category: 'Robotics & Autonomous', description: 'da Vinci robotic surgical systems with AI assistance, image analysis, and haptic feedback.' },

  // Other AI
  { ticker: 'NYSE:UBER',    symbol: 'UBER',  name: 'Uber',                 shortName: 'Uber',           category: 'Other AI', description: 'AI-driven ride matching, dynamic pricing, and autonomous vehicle technology partnerships.' },
  { ticker: 'NASDAQ:MRNA',  symbol: 'MRNA',  name: 'Moderna',              shortName: 'Moderna',        category: 'Other AI', description: 'mRNA platform with AI-driven drug discovery and personalized cancer vaccine programs.' },
  { ticker: 'NYSE:GS',      symbol: 'GS',    name: 'Goldman Sachs',        shortName: 'Goldman Sachs',  category: 'Other AI', description: 'AI-powered trading, GS Dossier research tool, and significant enterprise AI adoption.' },
  { ticker: 'NASDAQ:HOOD',  symbol: 'HOOD',  name: 'Robinhood',            shortName: 'Robinhood',      category: 'Other AI', description: 'AI-powered investing tools, Robinhood Strategies, and personalized financial insights.' },
];

const PRIVATE_COMPANIES = [
  {
    name: 'OpenAI',
    valuationText: '~$300B+',
    valuationAsOf: '2025-Q4',
    sourceName: 'Bloomberg, Forbes',
    lastReviewed: '2026-01',
    description: 'GPT-4o, o3, ChatGPT, DALL-E 3, Sora. Deep Microsoft partnership with $13B+ invested. Pursuing semiconductor and AGI strategy.',
  },
  {
    name: 'Anthropic',
    valuationText: '~$60B',
    valuationAsOf: '2025-Q1',
    sourceName: 'Reuters, WSJ',
    lastReviewed: '2026-01',
    description: 'Claude AI assistant family. Backed by Google and Amazon. Focus on AI safety, constitutional AI, and responsible scaling.',
  },
  {
    name: 'xAI',
    valuationText: '~$50B',
    valuationAsOf: '2024-Q4',
    sourceName: 'Bloomberg',
    lastReviewed: '2026-01',
    description: "Elon Musk's AI company. Grok AI assistant integrated with X (Twitter). Building large-scale AI supercomputer infrastructure.",
  },
  {
    name: 'Databricks',
    valuationText: '~$62B',
    valuationAsOf: '2024-Q4',
    sourceName: 'TechCrunch',
    lastReviewed: '2026-01',
    description: 'Data + AI lakehouse platform. DBRX open model. Used by 10,000+ enterprises for analytics, ML, and AI application development.',
  },
  {
    name: 'Scale AI',
    valuationText: '~$14B',
    valuationAsOf: '2024-Q2',
    sourceName: 'Reuters',
    lastReviewed: '2026-01',
    description: 'AI training data platform, RLHF annotation, and evaluation for frontier AI models including major LLM providers.',
  },
];

const COMPARISON_PRESETS = [
  { label: 'None',         symbols: [] },
  { label: 'vs. S&P 500',  symbols: [{ symbol: 'SP:SPX',       position: 'SameScale' }] },
  { label: 'vs. QQQ',      symbols: [{ symbol: 'NASDAQ:QQQ',   position: 'SameScale' }] },
  { label: 'vs. NVDA',     symbols: [{ symbol: 'NASDAQ:NVDA',  position: 'SameScale' }] },
  { label: 'AI Leaders',   symbols: [{ symbol: 'NASDAQ:NVDA',  position: 'SameScale' }, { symbol: 'NASDAQ:MSFT',  position: 'SameScale' }, { symbol: 'NASDAQ:GOOGL', position: 'SameScale' }] },
  { label: 'Chip Sector',  symbols: [{ symbol: 'NASDAQ:AMD',   position: 'SameScale' }, { symbol: 'NASDAQ:INTC',  position: 'SameScale' }, { symbol: 'NASDAQ:AVGO',  position: 'SameScale' }] },
  { label: 'Cloud Trio',   symbols: [{ symbol: 'NASDAQ:MSFT',  position: 'SameScale' }, { symbol: 'NASDAQ:GOOGL', position: 'SameScale' }, { symbol: 'NASDAQ:AMZN',  position: 'SameScale' }] },
];

const TIME_RANGES = [
  { label: '1D',  range: '1D',  interval: '5'  },
  { label: '5D',  range: '5D',  interval: '15' },
  { label: '1M',  range: '1M',  interval: 'D'  },
  { label: '6M',  range: '6M',  interval: 'D'  },
  { label: 'YTD', range: 'YTD', interval: 'D'  },
  { label: '1Y',  range: '12M', interval: 'W'  },
  { label: '5Y',  range: '60M', interval: 'W'  },
  { label: 'MAX', range: 'ALL', interval: 'M'  },
];

const NEWS_ALIASES = {
  'NASDAQ:NVDA':  ['nvidia', 'nvda', 'jensen huang', 'h100', 'h200', 'blackwell', 'hopper gpu'],
  'NASDAQ:MSFT':  ['microsoft', 'msft', 'azure', 'copilot', 'satya nadella', 'openai microsoft'],
  'NASDAQ:GOOGL': ['google', 'alphabet', 'googl', 'gemini', 'deepmind', 'waymo', 'sundar pichai'],
  'NASDAQ:AMZN':  ['amazon', 'aws', 'amzn', 'bedrock', 'trainium', 'alexa', 'amazon web services'],
  'NASDAQ:META':  ['meta', 'facebook', 'llama', 'zuckerberg', 'meta ai', 'instagram ai'],
  'NYSE:ORCL':    ['oracle', 'orcl', 'larry ellison', 'stargate oracle'],
  'NYSE:IBM':     ['ibm', 'watson', 'granite'],
  'NYSE:PLTR':    ['palantir', 'pltr', 'alex karp', 'aip'],
  'NYSE:AI':      ['c3.ai', 'c3ai'],
  'NYSE:PATH':    ['uipath'],
  'NYSE:SNOW':    ['snowflake', 'snowpark', 'cortex ai'],
  'NASDAQ:DDOG':  ['datadog', 'ddog'],
  'NASDAQ:SOUN':  ['soundhound', 'soun'],
  'NYSE:CRM':     ['salesforce', 'einstein ai', 'agentforce', 'benioff'],
  'NASDAQ:ADBE':  ['adobe', 'adbe', 'firefly'],
  'NYSE:NOW':     ['servicenow', 'now assist'],
  'NASDAQ:WDAY':  ['workday', 'wday'],
  'NYSE:ANET':    ['arista networks', 'anet'],
  'NASDAQ:AMD':   ['amd', 'advanced micro', 'lisa su', 'mi300', 'instinct gpu'],
  'NASDAQ:INTC':  ['intel', 'intc', 'gaudi'],
  'NASDAQ:AVGO':  ['broadcom', 'avgo', 'custom asic', 'xpu'],
  'NASDAQ:ARM':   ['arm holdings', 'arm architecture'],
  'NYSE:TSM':     ['tsmc', 'taiwan semiconductor'],
  'NASDAQ:ASML':  ['asml', 'euv lithography'],
  'NASDAQ:CRWD':  ['crowdstrike', 'crwd', 'charlotte ai', 'falcon platform'],
  'NASDAQ:PANW':  ['palo alto networks', 'panw', 'cortex xsiam'],
  'NYSE:S':       ['sentinelone', 'purple ai'],
  'NASDAQ:TSLA':  ['tesla', 'tsla', 'optimus', 'full self-driving', 'fsd', 'dojo'],
  'NASDAQ:SMCI':  ['supermicro', 'super micro', 'smci'],
  'NASDAQ:ISRG':  ['intuitive surgical', 'da vinci'],
  'NASDAQ:CDNS':  ['cadence', 'jedai'],
  'NASDAQ:SNPS':  ['synopsys'],
};

/* ─────────────────────────────────────────────────────────────── */
/* State                                                             */
/* ─────────────────────────────────────────────────────────────── */

const LS_FAVORITES = 'aiPolicyTracker.stockFavorites.v1';
const LS_RECENT    = 'aiPolicyTracker.stockRecent.v1';
const LS_PREFS     = 'aiPolicyTracker.stockPrefs.v1';

const stocksState = {
  initialized:     false,
  selectedSymbol:  'NASDAQ:NVDA',
  activeListTab:   'all',
  searchQuery:     '',
  categoryFilter:  '',
  timeRange:       '1M',
  comparePreset:   0,
  activeDetailTab: 'overview',
  themeObserver:   null,
  sidebarOpen:     false,
  heatmapLoaded:   false,
  moversLoaded:    false,
  universeLoaded:  false,
  lazyObserver:    null,
};

/* ─────────────────────────────────────────────────────────────── */
/* Company helpers                                                   */
/* ─────────────────────────────────────────────────────────────── */

function getCompanyByTicker(ticker) {
  return AI_COMPANIES.find(c => c.ticker === ticker) || null;
}

function getPlainSymbol(ticker) {
  const c = getCompanyByTicker(ticker);
  if (c) return c.symbol;
  const colon = ticker.indexOf(':');
  return colon >= 0 ? ticker.slice(colon + 1) : ticker;
}

/* ─────────────────────────────────────────────────────────────── */
/* LocalStorage helpers                                              */
/* ─────────────────────────────────────────────────────────────── */

function stocksLoadFavorites() {
  try { return JSON.parse(localStorage.getItem(LS_FAVORITES) || '[]'); } catch { return []; }
}
function stocksSaveFavorites(arr) {
  try { localStorage.setItem(LS_FAVORITES, JSON.stringify(arr)); } catch {}
}
function stocksIsFavorite(ticker) { return stocksLoadFavorites().includes(ticker); }
function stocksToggleFavorite(ticker) {
  const favs = stocksLoadFavorites();
  const idx = favs.indexOf(ticker);
  if (idx >= 0) favs.splice(idx, 1); else favs.unshift(ticker);
  stocksSaveFavorites(favs);
}

function stocksLoadRecent() {
  try { return JSON.parse(localStorage.getItem(LS_RECENT) || '[]'); } catch { return []; }
}
function stocksAddRecent(ticker) {
  const r = stocksLoadRecent().filter(t => t !== ticker);
  r.unshift(ticker);
  try { localStorage.setItem(LS_RECENT, JSON.stringify(r.slice(0, 8))); } catch {}
}

function stocksLoadPrefs() {
  const defaults = { lastSymbol: 'NASDAQ:NVDA', timeRange: '1M', comparePreset: 0, activeDetailTab: 'overview' };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(LS_PREFS) || '{}') }; }
  catch { return defaults; }
}
function stocksSavePrefs(patch) {
  try { localStorage.setItem(LS_PREFS, JSON.stringify({ ...stocksLoadPrefs(), ...patch })); } catch {}
}

function stocksExportCSV() {
  const favs = stocksLoadFavorites();
  if (favs.length === 0) { stocksToast('No favorites to export'); return; }
  const rows = [['Symbol', 'Name', 'Exchange', 'Category', 'Description']];
  favs.forEach(ticker => {
    const c = getCompanyByTicker(ticker);
    if (c) rows.push([
      c.symbol, c.name,
      c.ticker.split(':')[0],
      c.category,
      c.description.replace(/"/g, '""'),
    ]);
  });
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ai-stocks-favorites.csv';
  a.click();
  URL.revokeObjectURL(url);
  stocksToast('Favorites exported as CSV');
}

/* ─────────────────────────────────────────────────────────────── */
/* URL routing                                                       */
/* ─────────────────────────────────────────────────────────────── */

function stocksGetSymbolFromURL() {
  const h = window.location.hash;
  if (!h.startsWith('#ai-stocks')) return null;
  const qi = h.indexOf('?');
  if (qi < 0) return null;
  return new URLSearchParams(h.slice(qi + 1)).get('symbol') || null;
}

function stocksUpdateURL(symbol) {
  history.replaceState(null, '', `${location.pathname}#ai-stocks?symbol=${encodeURIComponent(symbol)}`);
}

/* ─────────────────────────────────────────────────────────────── */
/* TradingView widget factory                                        */
/* ─────────────────────────────────────────────────────────────── */

let _tvRenderCounter = 0;

function createTVWidget(container, widgetName, config) {
  const renderId = ++_tvRenderCounter;
  container._tvRenderId = renderId;
  container.innerHTML = '<div class="tv-loading"><div class="tv-loading-spinner"></div><span>Loading chart…</span></div>';
  const w = document.createElement('div');
  w.className = 'tradingview-widget-container__widget';
  const s = document.createElement('script');
  s.type = 'text/javascript';
  s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${widgetName}.js`;
  s.async = true;
  s.textContent = JSON.stringify(config);
  const TIMEOUT_MS = 12000;
  let settled = false;
  const timer = setTimeout(() => {
    if (!settled && container._tvRenderId === renderId) {
      settled = true;
      _tvShowError(container, widgetName, config);
    }
  }, TIMEOUT_MS);
  s.onload = () => {
    if (container._tvRenderId !== renderId) return;
    settled = true;
    clearTimeout(timer);
    const loading = container.querySelector('.tv-loading');
    if (loading) loading.remove();
  };
  s.onerror = () => {
    if (!settled && container._tvRenderId === renderId) {
      settled = true;
      clearTimeout(timer);
      _tvShowError(container, widgetName, config);
    }
  };
  container.appendChild(w);
  container.appendChild(s);
}

/* Widget containers vary from a ~44px ticker strip to a 520px chart. A single
   fixed-height error block overflowed the short ones and visually collided with
   the sections below it, so the error is sized from the container it lands in
   and is absolutely positioned to fill it — it can never spill. */
function _tvShowError(container, widgetName, config) {
  // A decorative ticker strip that fails should recede, not shout. Hiding it
  // avoids a broken-looking band across the top of the page.
  if (container.id === 'stocks-tape') {
    container.hidden = true;
    return;
  }

  container.classList.add('tv-has-error');
  container.innerHTML =
    '<div class="tv-error">' +
    '<div class="tv-error-icon" aria-hidden="true">📡</div>' +
    '<div class="tv-error-msg">Data unavailable</div>' +
    '<div class="tv-error-sub">TradingView could not be reached. ' +
    'Market data is provided by TradingView and delayed 15 minutes.</div>' +
    '<button class="tv-retry-btn" type="button">Retry</button>' +
    '</div>';

  /* Decide the layout AFTER the browser has laid the container out. Measuring
     synchronously here reads 0 when the widget failed before first layout, so
     a short strip such as #stocks-symbol-info kept the tall variant and had
     its text clipped. Below ~140px there is no room for icon + heading + body
     + button, so those collapse to a single line. */
  const el = container.querySelector('.tv-error');
  requestAnimationFrame(() => {
    if (!el.isConnected) return;
    const h = container.getBoundingClientRect().height;
    if (h > 0 && h < 140) el.classList.add('tv-error-compact');
  });

  container.querySelector('.tv-retry-btn')?.addEventListener('click', () => {
    container.classList.remove('tv-has-error');
    createTVWidget(container, widgetName, config);
  });
}

function tvTheme() {
  return (typeof isDarkTheme === 'function' ? isDarkTheme() : true) ? 'dark' : 'light';
}

/* ─────────────────────────────────────────────────────────────── */
/* HTML builder                                                      */
/* ─────────────────────────────────────────────────────────────── */

function buildStocksUI() {
  const view = document.getElementById('stocks-view');
  if (!view) return;

  const cats = [...new Set(AI_COMPANIES.map(c => c.category))];
  const catOpts = cats.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
  const cmpOpts = COMPARISON_PRESETS.map((p, i) =>
    `<option value="${i}">${escHtml(p.label)}</option>`).join('');
  const timeBtns = TIME_RANGES.map(r =>
    `<button class="stocks-time-btn${r.label === '1M' ? ' active' : ''}" data-range="${r.range}" data-interval="${r.interval}">${r.label}</button>`).join('');

  view.innerHTML = `
    <div id="stocks-tape" class="tv-widget-wrap stocks-tape"></div>

    <div id="stocks-workspace">
      <div id="stocks-main">
        <div id="stocks-selected">
          <div id="stocks-selected-header">
            <div id="stocks-selected-title">
              <span id="stocks-selected-symbol"></span>
              <span id="stocks-selected-name"></span>
            </div>
            <div id="stocks-selected-actions">
              <button id="stocks-fav-btn" class="stocks-action-btn" aria-pressed="false">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span id="stocks-fav-label">Favorite</span>
              </button>
              <button id="stocks-share-btn" class="stocks-action-btn" aria-label="Share this stock">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Share
              </button>
            </div>
          </div>
          <div id="stocks-selected-desc"></div>
        </div>

        <div id="stocks-symbol-info" class="tv-widget-wrap"></div>

        <div id="stocks-chart-controls">
          <div id="stocks-time-btns" role="group" aria-label="Time range">${timeBtns}</div>
          <div id="stocks-compare-wrap">
            <label for="stocks-compare-select" class="stocks-compare-label">Compare</label>
            <select id="stocks-compare-select">${cmpOpts}</select>
          </div>
        </div>

        <div id="stocks-chart" class="tv-widget-wrap"></div>

        <div id="stocks-detail-tabs" role="tablist">
          <button class="stocks-detail-tab active" data-tab="overview"      role="tab" aria-selected="true">Overview</button>
          <button class="stocks-detail-tab"         data-tab="fundamentals" role="tab" aria-selected="false">Fundamentals</button>
          <button class="stocks-detail-tab"         data-tab="technical"    role="tab" aria-selected="false">Technical</button>
          <button class="stocks-detail-tab"         data-tab="profile"      role="tab" aria-selected="false">Profile</button>
          <button class="stocks-detail-tab"         data-tab="news"         role="tab" aria-selected="false">News</button>
        </div>
        <div id="stocks-detail-body" class="tv-widget-wrap"></div>
      </div>

      <aside id="stocks-sidebar" aria-label="Stock browser">
        <div id="stocks-sidebar-toggle-bar">
          <button id="stocks-browser-btn" aria-expanded="false" aria-controls="stocks-sidebar-body">
            <span id="stocks-browser-btn-label">Browse Companies (${AI_COMPANIES.length})</span>
            <svg class="stocks-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        </div>
        <div id="stocks-sidebar-body">
          <div id="stocks-controls-bar">
            <div id="stocks-search-wrap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input id="stocks-search" type="text" placeholder="Search companies… ( / )" autocomplete="off" aria-label="Search companies" />
              <button id="stocks-search-clear" hidden aria-label="Clear search">&times;</button>
            </div>
            <select id="stocks-cat-filter" aria-label="Filter by category">
              <option value="">All Categories</option>${catOpts}
            </select>
          </div>

          <div id="stocks-list-tabs" role="tablist">
            <button class="stocks-list-tab active" data-list="all"       role="tab" aria-selected="true">All</button>
            <button class="stocks-list-tab"         data-list="favorites" role="tab" aria-selected="false">★ Favs</button>
            <button class="stocks-list-tab"         data-list="recent"   role="tab" aria-selected="false">Recent</button>
          </div>

          <ul id="stocks-watchlist" role="list" aria-label="AI company watchlist"></ul>

          <div id="stocks-sidebar-footer">
            <button id="stocks-export-csv" class="stocks-export-btn" type="button" title="Export favorites as CSV">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Favorites CSV
            </button>
            <span class="stocks-kb-hint">
              <kbd>/</kbd> search &nbsp;·&nbsp; <kbd>F</kbd> favorite
            </span>
          </div>
        </div>
      </aside>
    </div>

    <div class="stocks-section" id="stocks-heatmap-section">
      <div class="stocks-section-header">
        <div>
          <h2>US Market Heatmap</h2>
          <p class="stocks-section-sub">S&amp;P 500 by sector and market cap</p>
        </div>
      </div>
      <div id="stocks-heatmap" class="tv-widget-wrap tv-heatmap"></div>
    </div>

    <div class="stocks-section" id="stocks-movers-section">
      <div class="stocks-section-header"><h3>Market Movers</h3></div>
      <div id="stocks-movers" class="tv-widget-wrap"></div>
    </div>

    <div class="stocks-section" id="stocks-universe-section">
      <div class="stocks-section-header">
        <div>
          <h3>AI Company Universe</h3>
          <p class="stocks-section-sub">Market overview by AI sector</p>
        </div>
      </div>
      <div id="stocks-universe-widget" class="tv-widget-wrap"></div>
    </div>

    <div class="stocks-section" id="stocks-private-section">
      <div class="stocks-section-header">
        <h3>Private AI Companies</h3>
        <span class="stocks-section-note">Not publicly traded — valuations are estimates</span>
      </div>
      <div id="stocks-private-cards"></div>
    </div>

    <div id="stocks-disclaimer">
      Market data may be delayed up to 15 minutes. Charts and market data provided by
      <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView</a>.
      This information is for research and educational purposes only and is not investment advice.
    </div>

    <div id="stocks-toast" aria-live="polite" aria-atomic="true"></div>
  `;
}

/* ─────────────────────────────────────────────────────────────── */
/* Watchlist (company browser — row list)                           */
/* ─────────────────────────────────────────────────────────────── */

function renderWatchlist() {
  const list = document.getElementById('stocks-watchlist');
  if (!list) return;

  const { activeListTab, searchQuery, categoryFilter, selectedSymbol } = stocksState;
  const favs   = stocksLoadFavorites();
  const recent = stocksLoadRecent();

  let companies = AI_COMPANIES;

  if (activeListTab === 'favorites') {
    companies = AI_COMPANIES.filter(c => favs.includes(c.ticker));
  } else if (activeListTab === 'recent') {
    const byTicker = Object.fromEntries(AI_COMPANIES.map(c => [c.ticker, c]));
    companies = recent.map(t => byTicker[t]).filter(Boolean);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    companies = companies.filter(c =>
      c.symbol.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  }

  if (categoryFilter) {
    companies = companies.filter(c => c.category === categoryFilter);
  }

  const btnLabel = document.getElementById('stocks-browser-btn-label');
  if (btnLabel) btnLabel.textContent = `Browse Companies (${AI_COMPANIES.length})`;

  if (companies.length === 0) {
    list.innerHTML = '<li class="stocks-wl-empty">No companies match your filters.</li>';
    return;
  }

  /* Rows carry the full company name, not the abbreviated `shortName`
     ("Applied Matls", "Texas Instrs") which read as truncation bugs. The
     sidebar has room for the real names, and CSS ellipsis covers the rare
     overflow. The category moves to a sticky group header rather than
     repeating on every row — with 14 consecutive "Compute & Semiconductors"
     labels it was noise, not information. */
  let lastCategory = null;
  list.innerHTML = companies.map(c => {
    const isFav = favs.includes(c.ticker);
    const isSel = c.ticker === selectedSymbol;
    let header = '';
    if (c.category !== lastCategory) {
      lastCategory = c.category;
      header = `<li class="stocks-wl-group" role="presentation">${escHtml(c.category)}</li>`;
    }
    return `${header}<li class="stocks-wl-row${isSel ? ' selected' : ''}" data-ticker="${escHtml(c.ticker)}">
      <button class="stocks-wl-main" data-ticker="${escHtml(c.ticker)}" aria-current="${isSel ? 'true' : 'false'}" type="button" title="${escHtml(c.name)} (${escHtml(c.symbol)})">
        <span class="stocks-wl-symbol">${escHtml(c.symbol)}</span>
        <span class="stocks-wl-info">
          <span class="stocks-wl-name">${escHtml(c.name)}</span>
        </span>
      </button>
      <button class="stocks-wl-fav${isFav ? ' is-fav' : ''}" data-ticker="${escHtml(c.ticker)}" aria-label="${isFav ? 'Remove ' + escHtml(c.symbol) + ' from favorites' : 'Add ' + escHtml(c.symbol) + ' to favorites'}" type="button">★</button>
    </li>`;
  }).join('');

  list.querySelectorAll('.stocks-wl-main').forEach(btn => {
    btn.addEventListener('click', () => selectCompany(btn.dataset.ticker));
  });
  list.querySelectorAll('.stocks-wl-fav').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      stocksToggleFavorite(btn.dataset.ticker);
      renderWatchlist();
      if (btn.dataset.ticker === stocksState.selectedSymbol) updateFavButton();
      stocksToast(stocksIsFavorite(btn.dataset.ticker) ? 'Added to favorites' : 'Removed from favorites');
    });
  });

  // Scroll selected row into view within the sidebar list
  requestAnimationFrame(() => {
    const selRow = list.querySelector('.stocks-wl-row.selected');
    if (selRow) selRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* Company selection                                                 */
/* ─────────────────────────────────────────────────────────────── */

function selectCompany(ticker) {
  stocksState.selectedSymbol = ticker;
  stocksAddRecent(ticker);
  stocksSavePrefs({ lastSymbol: ticker });
  stocksUpdateURL(ticker);

  const co = getCompanyByTicker(ticker);
  if (co) {
    const symEl  = document.getElementById('stocks-selected-symbol');
    const nameEl = document.getElementById('stocks-selected-name');
    const descEl = document.getElementById('stocks-selected-desc');
    if (symEl)  symEl.textContent  = co.symbol;
    if (nameEl) nameEl.textContent = co.name;
    if (descEl) descEl.textContent = co.description;
  }

  updateFavButton();
  renderWatchlist();
  renderSymbolInfo();
  renderChart();
  renderDetailTab(stocksState.activeDetailTab);

  const sel = document.getElementById('stocks-selected');
  if (sel) {
    sel.classList.remove('stocks-panel-entering');
    requestAnimationFrame(() => sel.classList.add('stocks-panel-entering'));
  }
}

function updateFavButton() {
  const btn   = document.getElementById('stocks-fav-btn');
  const label = document.getElementById('stocks-fav-label');
  if (!btn) return;
  const isFav = stocksIsFavorite(stocksState.selectedSymbol);
  btn.classList.toggle('is-fav', isFav);
  btn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
  if (label) label.textContent = isFav ? 'Favorited' : 'Favorite';
}

/* ─────────────────────────────────────────────────────────────── */
/* Symbol info (header area)                                         */
/* ─────────────────────────────────────────────────────────────── */

function renderSymbolInfo() {
  const el = document.getElementById('stocks-symbol-info');
  if (!el) return;
  createTVWidget(el, 'symbol-info', {
    symbol:          stocksState.selectedSymbol,
    width:           '100%',
    locale:          'en',
    colorTheme:      tvTheme(),
    isTransparent:   false,
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* Chart                                                             */
/* ─────────────────────────────────────────────────────────────── */

function renderChart() {
  const el = document.getElementById('stocks-chart');
  if (!el) return;

  const tr = TIME_RANGES.find(r => r.label === stocksState.timeRange) || TIME_RANGES[2];
  const compareSymbols = COMPARISON_PRESETS[stocksState.comparePreset]?.symbols || [];

  const config = {
    autosize:            true,
    symbol:              stocksState.selectedSymbol,
    interval:            tr.interval,
    timezone:            'America/New_York',
    theme:               tvTheme(),
    style:               '1',
    locale:              'en',
    enable_publishing:   false,
    withdateranges:      false,
    range:               tr.range,
    hide_side_toolbar:   false,
    allow_symbol_change: true,
    save_image:          false,
    calendar:            false,
    support_host:        'https://www.tradingview.com',
  };
  if (compareSymbols.length > 0) config.compareSymbols = compareSymbols;

  createTVWidget(el, 'advanced-chart', config);
}

/* ─────────────────────────────────────────────────────────────── */
/* Detail tabs                                                       */
/* ─────────────────────────────────────────────────────────────── */

function renderDetailTab(tab) {
  stocksState.activeDetailTab = tab;
  stocksSavePrefs({ activeDetailTab: tab });

  document.querySelectorAll('.stocks-detail-tab').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  const el      = document.getElementById('stocks-detail-body');
  const ticker  = stocksState.selectedSymbol;
  const plainSym = getPlainSymbol(ticker);
  const company = getCompanyByTicker(ticker);
  const theme   = tvTheme();
  if (!el) return;

  if (tab === 'overview') {
    const tvLink = `https://www.tradingview.com/symbols/${encodeURIComponent(ticker.replace(':', '-'))}/`;
    const yhLink = `https://finance.yahoo.com/quote/${encodeURIComponent(plainSym)}/`;
    el.innerHTML = `
      <div class="stocks-overview-panel">
        ${company ? `
        <div class="stocks-overview-cat">${escHtml(company.category)}</div>
        <div class="stocks-overview-desc">${escHtml(company.description)}</div>` : ''}
        <div class="stocks-fallback-links" style="margin-top:14px;">
          <a href="${escHtml(yhLink)}" target="_blank" rel="noopener noreferrer" class="stocks-fallback-btn">Yahoo Finance</a>
          <a href="${escHtml(tvLink)}" target="_blank" rel="noopener noreferrer" class="stocks-fallback-btn">TradingView</a>
        </div>
      </div>`;
  } else if (tab === 'fundamentals') {
    createTVWidget(el, 'financials', {
      symbol:        ticker,
      colorTheme:    theme,
      isTransparent: false,
      locale:        'en',
      width:         '100%',
      height:        550,
      displayMode:   'regular',
    });
  } else if (tab === 'technical') {
    createTVWidget(el, 'technical-analysis', {
      interval:         'D',
      width:            '100%',
      isTransparent:    false,
      height:           450,
      symbol:           ticker,
      showIntervalTabs: false,
      displayMode:      'single',
      locale:           'en',
      colorTheme:       theme,
    });
  } else if (tab === 'profile') {
    const yhProfileLink = `https://finance.yahoo.com/quote/${encodeURIComponent(plainSym)}/profile/`;
    const yhSummaryLink = `https://finance.yahoo.com/quote/${encodeURIComponent(plainSym)}/`;
    el.innerHTML = `
      <div class="stocks-data-fallback">
        ${company ? `
        <div class="stocks-profile-cat">${escHtml(company.category)}</div>
        <div class="stocks-profile-name">${escHtml(company.name)}</div>
        <div class="stocks-profile-desc">${escHtml(company.description)}</div>` : ''}
        <div class="stocks-fallback-heading" style="margin-top:${company ? '16px' : '0'}">Company information</div>
        <div class="stocks-fallback-links">
          <a href="${escHtml(yhProfileLink)}" target="_blank" rel="noopener noreferrer" class="stocks-fallback-btn">Yahoo Finance — Profile</a>
          <a href="${escHtml(yhSummaryLink)}" target="_blank" rel="noopener noreferrer" class="stocks-fallback-btn">Yahoo Finance — Summary</a>
        </div>
      </div>`;
  } else if (tab === 'news') {
    renderNewsTab(el, ticker);
  }
}

function renderNewsTab(container, ticker) {
  container.innerHTML = '';
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const tvSection = document.createElement('div');
  tvSection.className = 'stocks-news-tv';
  createTVWidget(tvSection, 'timeline', {
    feedMode: 'symbol', isTransparent: false, displayMode: 'regular',
    width: '100%', height: 400, colorTheme: tvTheme(), symbol: ticker, locale: 'en',
  });
  container.appendChild(tvSection);

  const aliases  = NEWS_ALIASES[ticker] || [];
  const plainSym = getPlainSymbol(ticker).toLowerCase();
  const terms    = [plainSym, ...aliases].filter(Boolean);

  const pool = (typeof newsArticles !== 'undefined' && Array.isArray(newsArticles))
    ? newsArticles : [];

  const seenUrls   = new Set();
  const seenTitles = new Set();

  const local = pool.filter(a => {
    const url = a.url || '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
    const pubDate = new Date(a.published_at || a.publishedAt || '');
    if (!isNaN(pubDate.getTime()) && pubDate > today) return false;
    if (url && seenUrls.has(url)) return false;
    const titleKey = (a.title || '').toLowerCase().trim();
    if (titleKey && seenTitles.has(titleKey)) return false;
    const hay = `${a.title || ''} ${a.summary || ''} ${(a.tags || []).join(' ')}`.toLowerCase();
    if (!terms.some(t => t && hay.includes(t))) return false;
    if (url) seenUrls.add(url);
    if (titleKey) seenTitles.add(titleKey);
    return true;
  }).slice(0, 12);

  if (local.length === 0) return;

  const hdr = document.createElement('div');
  hdr.className = 'stocks-news-local-header';
  hdr.textContent = 'Related articles from AI News feed';
  container.appendChild(hdr);

  const list = document.createElement('div');
  list.className = 'stocks-news-local-list';
  list.innerHTML = local.map(a => `
    <a href="${escHtml(safeHref(a.url))}" target="_blank" rel="noopener noreferrer" class="stocks-news-item">
      <div class="stocks-news-cat">${escHtml(a.category || '')}</div>
      <div class="stocks-news-title">${escHtml(a.title || '')}</div>
      <div class="stocks-news-meta">
        <span class="stocks-news-source">${escHtml(a.source || '')}</span>
        <span class="stocks-news-date">${escHtml(formatDate(a.published_at || a.publishedAt || ''))}</span>
      </div>
    </a>`).join('');
  container.appendChild(list);
}

/* ─────────────────────────────────────────────────────────────── */
/* Ticker tape                                                       */
/* ─────────────────────────────────────────────────────────────── */

function renderTickerTape() {
  const el = document.getElementById('stocks-tape');
  if (!el) return;
  // _tvShowError() hides the strip when the widget fails; restore it so a
  // re-render (theme change, tab re-entry) gets another chance to load.
  el.hidden = false;
  const symbols = AI_COMPANIES.slice(0, 30).map(c => ({ proName: c.ticker, title: c.symbol }));
  createTVWidget(el, 'ticker-tape', {
    symbols, showSymbolLogo: true, isTransparent: true,
    displayMode: 'compact', colorTheme: tvTheme(), locale: 'en',
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* Heatmap, movers, universe (lazy-loaded)                          */
/* ─────────────────────────────────────────────────────────────── */

function renderHeatmap() {
  const el = document.getElementById('stocks-heatmap');
  if (!el) return;
  createTVWidget(el, 'stock-heatmap', {
    exchanges: [], dataSource: 'SPX500', grouping: 'sector',
    blockSize: 'market_cap_basic', blockColor: 'change', locale: 'en',
    symbolUrl: '', colorTheme: tvTheme(), hasVolume: false,
    isDataSetEnabled: false, isZoomEnabled: true, isMonoSize: false,
    width: '100%', height: 500,
  });
}

function renderMovers() {
  const el = document.getElementById('stocks-movers');
  if (!el) return;
  createTVWidget(el, 'hotlists', {
    colorTheme: tvTheme(), dateRange: '12M', exchange: 'US', showChart: false,
    locale: 'en', largeChartUrl: '', isTransparent: false,
    showSymbolLogo: false, showFloatingTooltip: false,
    width: '100%', height: 400,
  });
}

function renderUniverse() {
  const el = document.getElementById('stocks-universe-widget');
  if (!el) return;
  const byCategory = {};
  AI_COMPANIES.forEach(c => {
    if (!byCategory[c.category]) byCategory[c.category] = [];
    if (byCategory[c.category].length < 10) byCategory[c.category].push({ s: c.ticker, d: c.symbol });
  });
  const tabs = Object.entries(byCategory).map(([title, symbols]) => ({ title, symbols }));
  createTVWidget(el, 'market-overview', {
    colorTheme:          tvTheme(),
    dateRange:           '12M',
    showChart:           true,
    locale:              'en',
    largeChartUrl:       '',
    isTransparent:       false,
    showSymbolLogo:      true,
    showFloatingTooltip: false,
    width:               '100%',
    height:              550,
    tabs,
  });
}

function initLazyWidgets() {
  if (!('IntersectionObserver' in window)) {
    renderHeatmap();
    renderMovers();
    renderUniverse();
    stocksState.heatmapLoaded = stocksState.moversLoaded = stocksState.universeLoaded = true;
    return;
  }

  const targets = [
    { id: 'stocks-heatmap-section',  flag: 'heatmapLoaded',  render: renderHeatmap },
    { id: 'stocks-movers-section',   flag: 'moversLoaded',   render: renderMovers },
    { id: 'stocks-universe-section', flag: 'universeLoaded', render: renderUniverse },
  ];

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const t = targets.find(x => x.id === entry.target.id);
      if (t && !stocksState[t.flag]) {
        stocksState[t.flag] = true;
        t.render();
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' });

  targets.forEach(t => {
    const el = document.getElementById(t.id);
    if (el) observer.observe(el);
  });
  stocksState.lazyObserver = observer;
}

function _rerenderLoadedWidgets() {
  if (stocksState.heatmapLoaded)  renderHeatmap();
  if (stocksState.moversLoaded)   renderMovers();
  if (stocksState.universeLoaded) renderUniverse();
}

/* ─────────────────────────────────────────────────────────────── */
/* Private companies                                                 */
/* ─────────────────────────────────────────────────────────────── */

function renderPrivateCompanies() {
  const el = document.getElementById('stocks-private-cards');
  if (!el) return;
  el.innerHTML = PRIVATE_COMPANIES.map(p => `
    <div class="stocks-private-card">
      <div class="stocks-private-card-top">
        <span class="stocks-private-name">${escHtml(p.name)}</span>
        <span class="stocks-private-badge">Private</span>
      </div>
      <div class="stocks-private-val">
        Est. valuation: <strong>${escHtml(p.valuationText)}</strong>
        <span class="stocks-private-val-meta">· as of ${escHtml(p.valuationAsOf)} · ${escHtml(p.sourceName)}</span>
      </div>
      <div class="stocks-private-desc">${escHtml(p.description)}</div>
    </div>`).join('');
}

/* ─────────────────────────────────────────────────────────────── */
/* Share / toast                                                     */
/* ─────────────────────────────────────────────────────────────── */

async function stocksShare() {
  const co  = getCompanyByTicker(stocksState.selectedSymbol);
  const url = `${location.origin}${location.pathname}#ai-stocks?symbol=${encodeURIComponent(stocksState.selectedSymbol)}`;
  const text = co ? `${co.name} (${co.symbol}) — AI Stocks tracker` : 'AI Stocks tracker';

  if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await navigator.share({ title: text, url }); return; } catch {}
  }
  try {
    await navigator.clipboard.writeText(url);
    stocksToast('Link copied to clipboard');
  } catch {
    prompt('Copy this link:', url);
  }
}

function stocksToast(msg, dur) {
  const el = document.getElementById('stocks-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(el._tid);
  el._tid = setTimeout(() => el.classList.remove('visible'), dur || 2500);
}

/* ─────────────────────────────────────────────────────────────── */
/* Theme observer (debounced)                                        */
/* ─────────────────────────────────────────────────────────────── */

function initStocksThemeObserver() {
  if (stocksState.themeObserver) return;
  let _debounceTimer = null;
  let _lastTheme     = tvTheme();

  stocksState.themeObserver = new MutationObserver(() => {
    const nowTheme = tvTheme();
    if (nowTheme === _lastTheme) return;
    _lastTheme = nowTheme;
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      if (typeof activeTab !== 'undefined' && activeTab !== 'stocks') return;
      renderTickerTape();
      renderSymbolInfo();
      renderChart();
      renderDetailTab(stocksState.activeDetailTab);
      _rerenderLoadedWidgets();
    }, 150);
  });
  stocksState.themeObserver.observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme', 'class'],
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* Mobile sidebar toggle                                             */
/* ─────────────────────────────────────────────────────────────── */

function initMobileBrowserToggle() {
  const btn     = document.getElementById('stocks-browser-btn');
  const sidebar = document.getElementById('stocks-sidebar');
  if (!btn || !sidebar) return;
  btn.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    stocksState.sidebarOpen = isOpen;
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* Keyboard shortcuts                                                */
/* ─────────────────────────────────────────────────────────────── */

function initStocksKeyboard() {
  document.addEventListener('keydown', e => {
    if (typeof activeTab === 'undefined' || activeTab !== 'stocks') return;
    const tag = document.activeElement?.tagName;
    const inInput = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
    if (e.key === '/' && !inInput && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      document.getElementById('stocks-search')?.focus();
    }
    if ((e.key === 'f' || e.key === 'F') && !inInput && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      stocksToggleFavorite(stocksState.selectedSymbol);
      updateFavButton();
      renderWatchlist();
      stocksToast(stocksIsFavorite(stocksState.selectedSymbol) ? 'Added to favorites' : 'Removed from favorites');
    }
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* Events                                                            */
/* ─────────────────────────────────────────────────────────────── */

function bindStocksEvents() {
  const searchInput = document.getElementById('stocks-search');
  const searchClear = document.getElementById('stocks-search-clear');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      stocksState.searchQuery = searchInput.value.trim();
      if (searchClear) searchClear.hidden = !stocksState.searchQuery;
      renderWatchlist();
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      stocksState.searchQuery = '';
      if (searchInput) searchInput.value = '';
      searchClear.hidden = true;
      renderWatchlist();
    });
  }

  const catFilter = document.getElementById('stocks-cat-filter');
  if (catFilter) {
    catFilter.addEventListener('change', () => {
      stocksState.categoryFilter = catFilter.value;
      renderWatchlist();
    });
  }

  document.querySelectorAll('.stocks-list-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      stocksState.activeListTab = btn.dataset.list;
      document.querySelectorAll('.stocks-list-tab').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      renderWatchlist();
    });
  });

  document.querySelectorAll('.stocks-time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      stocksState.timeRange = btn.textContent.trim();
      stocksSavePrefs({ timeRange: stocksState.timeRange });
      document.querySelectorAll('.stocks-time-btn').forEach(b =>
        b.classList.toggle('active', b === btn));
      renderChart();
    });
  });

  const compareSelect = document.getElementById('stocks-compare-select');
  if (compareSelect) {
    compareSelect.addEventListener('change', () => {
      stocksState.comparePreset = parseInt(compareSelect.value, 10) || 0;
      stocksSavePrefs({ comparePreset: stocksState.comparePreset });
      renderChart();
    });
  }

  document.querySelectorAll('.stocks-detail-tab').forEach(btn => {
    btn.addEventListener('click', () => renderDetailTab(btn.dataset.tab));
  });

  const favBtn = document.getElementById('stocks-fav-btn');
  if (favBtn) {
    favBtn.addEventListener('click', () => {
      stocksToggleFavorite(stocksState.selectedSymbol);
      updateFavButton();
      renderWatchlist();
      stocksToast(stocksIsFavorite(stocksState.selectedSymbol) ? 'Added to favorites' : 'Removed from favorites');
    });
  }

  const shareBtn = document.getElementById('stocks-share-btn');
  if (shareBtn) shareBtn.addEventListener('click', stocksShare);

  const exportBtn = document.getElementById('stocks-export-csv');
  if (exportBtn) exportBtn.addEventListener('click', stocksExportCSV);
}

/* ─────────────────────────────────────────────────────────────── */
/* Entry point                                                       */
/* ─────────────────────────────────────────────────────────────── */

function initStocksPage() {
  const view = document.getElementById('stocks-view');
  if (!view) return;

  if (!stocksState.initialized) {
    const prefs = stocksLoadPrefs();
    stocksState.timeRange       = prefs.timeRange       || '1M';
    stocksState.comparePreset   = prefs.comparePreset   || 0;
    stocksState.activeDetailTab = prefs.activeDetailTab || 'overview';

    const fromURL   = stocksGetSymbolFromURL();
    const fromPref  = getCompanyByTicker(prefs.lastSymbol);
    const fromURLco = fromURL && getCompanyByTicker(fromURL);
    const defaultCo = fromURLco || fromPref || AI_COMPANIES[0];
    stocksState.selectedSymbol = defaultCo.ticker;

    buildStocksUI();
    bindStocksEvents();
    initMobileBrowserToggle();
    renderPrivateCompanies();
    initStocksThemeObserver();
    initStocksKeyboard();
    stocksState.initialized = true;

    renderTickerTape();
    initLazyWidgets();
  } else {
    const fromURL = stocksGetSymbolFromURL();
    if (fromURL) {
      const co = getCompanyByTicker(fromURL);
      if (co) stocksState.selectedSymbol = co.ticker;
    }
  }

  const co = getCompanyByTicker(stocksState.selectedSymbol) || AI_COMPANIES[0];
  stocksState.selectedSymbol = co.ticker;

  const symEl  = document.getElementById('stocks-selected-symbol');
  const nameEl = document.getElementById('stocks-selected-name');
  const descEl = document.getElementById('stocks-selected-desc');
  if (symEl)  symEl.textContent  = co.symbol;
  if (nameEl) nameEl.textContent = co.name;
  if (descEl) descEl.textContent = co.description;

  document.querySelectorAll('.stocks-time-btn').forEach(btn =>
    btn.classList.toggle('active', btn.textContent.trim() === stocksState.timeRange));

  const cmpSel = document.getElementById('stocks-compare-select');
  if (cmpSel) cmpSel.value = String(stocksState.comparePreset);

  updateFavButton();
  renderWatchlist();
  renderSymbolInfo();
  renderChart();
  renderDetailTab(stocksState.activeDetailTab);
  stocksUpdateURL(stocksState.selectedSymbol);
}

/* ─────────────────────────────────────────────────────────────── */
/* Hash-based navigation                                             */
/* ─────────────────────────────────────────────────────────────── */

window.addEventListener('hashchange', () => {
  if (window.location.hash.startsWith('#ai-stocks') && typeof switchTab === 'function') {
    switchTab('stocks');
  }
});

if (window.location.hash.startsWith('#ai-stocks')) {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof switchTab === 'function') switchTab('stocks');
  });
}
