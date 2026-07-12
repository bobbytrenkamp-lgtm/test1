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
  { ticker: 'NYSE:META',    symbol: 'META',  name: 'Meta Platforms',       shortName: 'Meta',           category: 'Cloud & Hyperscalers', description: 'Open-source Llama models, Meta AI assistant, and massive GPU infrastructure expansion.' },
  { ticker: 'NYSE:ORCL',    symbol: 'ORCL',  name: 'Oracle',               shortName: 'Oracle',         category: 'Cloud & Hyperscalers', description: 'OCI cloud for AI workloads, AI in Oracle Database, and Stargate data center partnership.' },
  { ticker: 'NYSE:IBM',     symbol: 'IBM',   name: 'IBM',                  shortName: 'IBM',            category: 'Cloud & Hyperscalers', description: 'Watson AI and Granite open models for enterprise; hybrid cloud AI deployment platform.' },

  // AI Software & Platforms
  { ticker: 'NYSE:PLTR',    symbol: 'PLTR',  name: 'Palantir',             shortName: 'Palantir',       category: 'AI Software & Platforms', description: 'AI-powered data analytics for government and enterprise with the Artificial Intelligence Platform (AIP).' },
  { ticker: 'NYSE:AI',      symbol: 'AI',    name: 'C3.ai',                shortName: 'C3.ai',          category: 'AI Software & Platforms', description: 'Enterprise AI application platform with vertical-specific AI solutions across industries.' },
  { ticker: 'NASDAQ:PATH',  symbol: 'PATH',  name: 'UiPath',               shortName: 'UiPath',         category: 'AI Software & Platforms', description: 'AI-powered robotic process automation (RPA) leader for enterprise workflow automation.' },
  { ticker: 'NYSE:SNOW',    symbol: 'SNOW',  name: 'Snowflake',            shortName: 'Snowflake',      category: 'AI Software & Platforms', description: 'Data cloud platform with Snowpark ML, Cortex AI, and AI-powered data products.' },
  { ticker: 'NASDAQ:DDOG',  symbol: 'DDOG',  name: 'Datadog',              shortName: 'Datadog',        category: 'AI Software & Platforms', description: 'Observability platform with AI monitoring, LLM observability, and Bits AI assistant.' },
  { ticker: 'NASDAQ:SOUN',  symbol: 'SOUN',  name: 'SoundHound AI',        shortName: 'SoundHound',     category: 'AI Software & Platforms', description: 'Voice AI and conversational interfaces for automotive, restaurants, and enterprise.' },

  // Enterprise AI
  { ticker: 'NYSE:CRM',     symbol: 'CRM',   name: 'Salesforce',           shortName: 'Salesforce',     category: 'Enterprise AI', description: 'Agentforce AI for sales and service automation; Einstein AI across all CRM products.' },
  { ticker: 'NASDAQ:ADBE',  symbol: 'ADBE',  name: 'Adobe',                shortName: 'Adobe',          category: 'Enterprise AI', description: 'Firefly generative AI for creative tools; Sensei AI across Document Cloud products.' },
  { ticker: 'NYSE:NOW',     symbol: 'NOW',   name: 'ServiceNow',           shortName: 'ServiceNow',     category: 'Enterprise AI', description: 'Now Assist AI agents for IT service management and enterprise workflow automation.' },
  { ticker: 'NASDAQ:WDAY',  symbol: 'WDAY',  name: 'Workday',              shortName: 'Workday',        category: 'Enterprise AI', description: 'AI-native HCM and financial management; Workday AI-powered co-pilot assistant.' },
  { ticker: 'NASDAQ:VEEV',  symbol: 'VEEV',  name: 'Veeva Systems',        shortName: 'Veeva',          category: 'Enterprise AI', description: 'AI cloud for life sciences; Vault AI and CRM AI for pharma R&D and commercial.' },

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
  { ticker: 'NASDAQ:UBER',  symbol: 'UBER',  name: 'Uber',                 shortName: 'Uber',           category: 'Other AI', description: 'AI-driven ride matching, dynamic pricing, and autonomous vehicle technology partnerships.' },
  { ticker: 'NASDAQ:MRNA',  symbol: 'MRNA',  name: 'Moderna',              shortName: 'Moderna',        category: 'Other AI', description: 'mRNA platform with AI-driven drug discovery and personalized cancer vaccine programs.' },
  { ticker: 'NYSE:GS',      symbol: 'GS',    name: 'Goldman Sachs',        shortName: 'Goldman Sachs',  category: 'Other AI', description: 'AI-powered trading, GS Dossier research tool, and significant enterprise AI adoption.' },
  { ticker: 'NASDAQ:HOOD',  symbol: 'HOOD',  name: 'Robinhood',            shortName: 'Robinhood',      category: 'Other AI', description: 'AI-powered investing tools, Robinhood Strategies, and personalized financial insights.' },
];

const PRIVATE_COMPANIES = [
  { name: 'OpenAI',     valuation: '~$300B+', description: 'GPT-4, o3, ChatGPT, DALL-E, Sora. Microsoft partnership with $13B+ invested.' },
  { name: 'Anthropic',  valuation: '~$60B',   description: 'Claude AI assistant family. Backed by Google ($2B) and Amazon ($4B).' },
  { name: 'xAI',        valuation: '~$50B',   description: "Elon Musk's AI company; Grok AI assistant integrated with X (Twitter)." },
  { name: 'Databricks', valuation: '~$62B',   description: 'Data + AI lakehouse platform. DBRX open model. Used by 10,000+ enterprises.' },
  { name: 'Scale AI',   valuation: '~$14B',   description: 'AI training data, RLHF annotation, and evaluation for frontier AI models.' },
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
  'NYSE:META':    ['meta', 'facebook', 'llama', 'zuckerberg', 'meta ai', 'instagram ai'],
  'NYSE:ORCL':    ['oracle', 'orcl', 'larry ellison', 'stargate oracle'],
  'NYSE:IBM':     ['ibm', 'watson', 'granite'],
  'NYSE:PLTR':    ['palantir', 'pltr', 'alex karp', 'aip'],
  'NYSE:AI':      ['c3.ai', 'c3ai'],
  'NASDAQ:PATH':  ['uipath'],
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
};

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

function createTVWidget(container, widgetName, config) {
  container.innerHTML = '';
  const w = document.createElement('div');
  w.className = 'tradingview-widget-container__widget';
  container.appendChild(w);
  const s = document.createElement('script');
  s.type = 'text/javascript';
  s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${widgetName}.js`;
  s.async = true;
  s.textContent = JSON.stringify(config);
  container.appendChild(s);
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

    <div id="stocks-controls-bar">
      <div id="stocks-search-wrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input id="stocks-search" type="text" placeholder="Search companies…" autocomplete="off" />
        <button id="stocks-search-clear" hidden aria-label="Clear">&times;</button>
      </div>
      <select id="stocks-cat-filter" aria-label="Filter by category">
        <option value="">All Categories</option>${catOpts}
      </select>
    </div>

    <div id="stocks-list-tabs" role="tablist">
      <button class="stocks-list-tab active" data-list="all" role="tab" aria-selected="true">All Companies</button>
      <button class="stocks-list-tab" data-list="favorites" role="tab" aria-selected="false">★ Favorites</button>
      <button class="stocks-list-tab" data-list="recent" role="tab" aria-selected="false">Recent</button>
    </div>

    <div id="stocks-company-grid"></div>

    <div id="stocks-selected">
      <div id="stocks-selected-header">
        <div id="stocks-selected-title">
          <span id="stocks-selected-symbol"></span>
          <span id="stocks-selected-name"></span>
        </div>
        <div id="stocks-selected-actions">
          <button id="stocks-fav-btn" class="stocks-action-btn" aria-pressed="false">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span id="stocks-fav-label">Favorite</span>
          </button>
          <button id="stocks-share-btn" class="stocks-action-btn" aria-label="Share this stock">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
        </div>
      </div>
      <div id="stocks-selected-desc"></div>

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

    <div class="stocks-section" id="stocks-heatmap-section">
      <div class="stocks-section-header"><h3>AI Market Heatmap</h3></div>
      <div id="stocks-heatmap" class="tv-widget-wrap"></div>
    </div>

    <div class="stocks-section" id="stocks-movers-section">
      <div class="stocks-section-header"><h3>Market Movers</h3></div>
      <div id="stocks-movers" class="tv-widget-wrap"></div>
    </div>

    <div class="stocks-section" id="stocks-private-section">
      <div class="stocks-section-header">
        <h3>Private AI Companies</h3>
        <span class="stocks-section-note">Not publicly traded</span>
      </div>
      <div id="stocks-private-cards"></div>
    </div>

    <div id="stocks-disclaimer">
      Market data may be delayed. Charts and market data provided by
      <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView</a>.
      This information is for research and educational purposes only and is not investment advice.
    </div>

    <div id="stocks-toast" aria-live="polite" aria-atomic="true"></div>
  `;
}

/* ─────────────────────────────────────────────────────────────── */
/* Company grid                                                      */
/* ─────────────────────────────────────────────────────────────── */

function renderCompanyGrid() {
  const grid = document.getElementById('stocks-company-grid');
  if (!grid) return;

  const { activeListTab, searchQuery, categoryFilter, selectedSymbol } = stocksState;
  const favs   = stocksLoadFavorites();
  const recent = stocksLoadRecent();

  let companies = AI_COMPANIES;

  if (activeListTab === 'favorites') {
    companies = AI_COMPANIES.filter(c => favs.includes(c.ticker));
  } else if (activeListTab === 'recent') {
    const byTicker = {};
    AI_COMPANIES.forEach(c => { byTicker[c.ticker] = c; });
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

  if (companies.length === 0) {
    grid.innerHTML = '<div class="stocks-empty">No companies match your filters.</div>';
    return;
  }

  grid.innerHTML = companies.map(c => {
    const isFav = favs.includes(c.ticker);
    const isSel = c.ticker === selectedSymbol;
    return `<button class="stocks-co-card${isSel ? ' selected' : ''}" data-ticker="${escHtml(c.ticker)}" aria-pressed="${isSel}">
      <div class="stocks-co-card-top">
        <span class="stocks-co-symbol">${escHtml(c.symbol)}</span>
        <span role="button" tabindex="0" class="stocks-fav-star${isFav ? ' is-fav' : ''}" data-ticker="${escHtml(c.ticker)}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">★</span>
      </div>
      <div class="stocks-co-name">${escHtml(c.shortName)}</div>
      <div class="stocks-co-cat">${escHtml(c.category)}</div>
    </button>`;
  }).join('');

  grid.querySelectorAll('.stocks-co-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('stocks-fav-star')) return;
      selectCompany(card.dataset.ticker);
    });
  });
  grid.querySelectorAll('.stocks-fav-star').forEach(btn => {
    const toggle = e => {
      e.stopPropagation();
      stocksToggleFavorite(btn.dataset.ticker);
      renderCompanyGrid();
      if (btn.dataset.ticker === stocksState.selectedSymbol) updateFavButton();
    };
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); } });
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

  const co = AI_COMPANIES.find(c => c.ticker === ticker);
  if (co) {
    const symEl  = document.getElementById('stocks-selected-symbol');
    const nameEl = document.getElementById('stocks-selected-name');
    const descEl = document.getElementById('stocks-selected-desc');
    if (symEl)  symEl.textContent  = co.symbol;
    if (nameEl) nameEl.textContent = co.name;
    if (descEl) descEl.textContent = co.description;
  }

  updateFavButton();
  renderCompanyGrid();
  renderChart();
  renderDetailTab(stocksState.activeDetailTab);

  const sel = document.getElementById('stocks-selected');
  if (sel) sel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  const el    = document.getElementById('stocks-detail-body');
  const sym   = stocksState.selectedSymbol;
  const theme = tvTheme();
  if (!el) return;

  if (tab === 'overview') {
    createTVWidget(el, 'symbol-info', {
      symbol: sym, width: '100%', locale: 'en', colorTheme: theme, isTransparent: false,
    });
  } else if (tab === 'fundamentals') {
    createTVWidget(el, 'fundamental-data', {
      isTransparent: false, largeChartUrl: '', displayMode: 'regular',
      width: '100%', height: 830, colorTheme: theme, symbol: sym, locale: 'en',
    });
  } else if (tab === 'technical') {
    createTVWidget(el, 'technical-analysis', {
      interval: '1m', width: '100%', isTransparent: false, height: 450,
      symbol: sym, showIntervalTabs: true, displayMode: 'single', locale: 'en', colorTheme: theme,
    });
  } else if (tab === 'profile') {
    createTVWidget(el, 'company-profile', {
      width: '100%', height: 480, isTransparent: false, colorTheme: theme, symbol: sym, locale: 'en',
    });
  } else if (tab === 'news') {
    renderNewsTab(el, sym);
  }
}

function renderNewsTab(container, ticker) {
  container.innerHTML = '';

  const tvSection = document.createElement('div');
  tvSection.className = 'stocks-news-tv';
  createTVWidget(tvSection, 'timeline', {
    feedMode: 'symbol', isTransparent: false, displayMode: 'regular',
    width: '100%', height: 400, colorTheme: tvTheme(), symbol: ticker, locale: 'en',
  });
  container.appendChild(tvSection);

  const aliases = NEWS_ALIASES[ticker] || [];
  const sym     = (AI_COMPANIES.find(c => c.ticker === ticker)?.symbol || '').toLowerCase();
  const terms   = [sym, ...aliases].filter(Boolean);

  const pool = (typeof newsArticles !== 'undefined' && Array.isArray(newsArticles))
    ? newsArticles : [];
  const local = pool.filter(a => {
    const hay = `${a.title || ''} ${a.summary || ''} ${(a.tags || []).join(' ')}`.toLowerCase();
    return terms.some(t => t && hay.includes(t));
  }).slice(0, 12);

  if (local.length === 0) return;

  const hdr = document.createElement('div');
  hdr.className = 'stocks-news-local-header';
  hdr.textContent = 'Related articles from AI News feed';
  container.appendChild(hdr);

  const list = document.createElement('div');
  list.className = 'stocks-news-local-list';
  list.innerHTML = local.map(a => `
    <a href="${escHtml(a.url || '#')}" target="_blank" rel="noopener noreferrer" class="stocks-news-item">
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
  const symbols = AI_COMPANIES.slice(0, 30).map(c => ({ proName: c.ticker, title: c.symbol }));
  createTVWidget(el, 'ticker-tape', {
    symbols, showSymbolLogo: true, isTransparent: false,
    displayMode: 'compact', colorTheme: tvTheme(), locale: 'en',
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* Heatmap & movers                                                  */
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
      <div class="stocks-private-val">Est. valuation: ${escHtml(p.valuation)}</div>
      <div class="stocks-private-desc">${escHtml(p.description)}</div>
    </div>`).join('');
}

/* ─────────────────────────────────────────────────────────────── */
/* Share                                                             */
/* ─────────────────────────────────────────────────────────────── */

async function stocksShare() {
  const co  = AI_COMPANIES.find(c => c.ticker === stocksState.selectedSymbol);
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
/* Theme observer                                                    */
/* ─────────────────────────────────────────────────────────────── */

function initStocksThemeObserver() {
  if (stocksState.themeObserver) return;
  stocksState.themeObserver = new MutationObserver(() => {
    if (typeof activeTab !== 'undefined' && activeTab !== 'stocks') return;
    renderTickerTape();
    renderChart();
    renderDetailTab(stocksState.activeDetailTab);
    renderHeatmap();
    renderMovers();
  });
  stocksState.themeObserver.observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme', 'class'],
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
      renderCompanyGrid();
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      stocksState.searchQuery = '';
      if (searchInput) searchInput.value = '';
      searchClear.hidden = true;
      renderCompanyGrid();
    });
  }

  const catFilter = document.getElementById('stocks-cat-filter');
  if (catFilter) {
    catFilter.addEventListener('change', () => {
      stocksState.categoryFilter = catFilter.value;
      renderCompanyGrid();
    });
  }

  document.querySelectorAll('.stocks-list-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      stocksState.activeListTab = btn.dataset.list;
      document.querySelectorAll('.stocks-list-tab').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      renderCompanyGrid();
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
      renderCompanyGrid();
      stocksToast(stocksIsFavorite(stocksState.selectedSymbol) ? 'Added to favorites' : 'Removed from favorites');
    });
  }

  const shareBtn = document.getElementById('stocks-share-btn');
  if (shareBtn) shareBtn.addEventListener('click', stocksShare);
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

    // Resolve symbol: URL → last pref → default
    const fromURL = stocksGetSymbolFromURL();
    const fromPref = AI_COMPANIES.find(c => c.ticker === prefs.lastSymbol);
    const fromURLco = fromURL && AI_COMPANIES.find(c => c.ticker === fromURL);
    const defaultCo = fromURLco || fromPref || AI_COMPANIES[0];
    stocksState.selectedSymbol = defaultCo.ticker;

    buildStocksUI();
    bindStocksEvents();
    renderPrivateCompanies();
    initStocksThemeObserver();
    stocksState.initialized = true;

    // Once-only widgets (no symbol dependency)
    renderTickerTape();
    renderHeatmap();
    renderMovers();
  } else {
    // On re-visit: pick up URL change if any
    const fromURL = stocksGetSymbolFromURL();
    if (fromURL) {
      const co = AI_COMPANIES.find(c => c.ticker === fromURL);
      if (co) stocksState.selectedSymbol = co.ticker;
    }
  }

  // Sync selected company header
  const co = AI_COMPANIES.find(c => c.ticker === stocksState.selectedSymbol) || AI_COMPANIES[0];
  stocksState.selectedSymbol = co.ticker;

  const symEl  = document.getElementById('stocks-selected-symbol');
  const nameEl = document.getElementById('stocks-selected-name');
  const descEl = document.getElementById('stocks-selected-desc');
  if (symEl)  symEl.textContent  = co.symbol;
  if (nameEl) nameEl.textContent = co.name;
  if (descEl) descEl.textContent = co.description;

  // Sync time range buttons
  document.querySelectorAll('.stocks-time-btn').forEach(btn =>
    btn.classList.toggle('active', btn.textContent.trim() === stocksState.timeRange));

  // Sync compare select
  const cmpSel = document.getElementById('stocks-compare-select');
  if (cmpSel) cmpSel.value = String(stocksState.comparePreset);

  updateFavButton();
  renderCompanyGrid();
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
