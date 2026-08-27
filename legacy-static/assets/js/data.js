/* =============================================================================
   data.js - All mock datasets for the SDG 17 Global Partnership Hub.
   Embedded as plain JS (not JSON + fetch) so the app runs fully offline from
   the file:// protocol without tripping CORS. Presentation-safe by design.
   ============================================================================= */
(function (global) {
  'use strict';

  /* The five official SDG 17 means-of-implementation pillars. */
  var PILLARS = [
    {
      id: 'finance',
      icon: '\u{1F4B0}',
      name: 'Finance',
      tagline: 'Mobilising resources where they matter most',
      blurb: 'Domestic revenue, development assistance and private capital have to flow toward the communities carrying the heaviest burden. SDG 17 treats money as plumbing: it only counts once it reaches the ground.',
      targets: ['17.1 Domestic resource mobilisation', '17.3 Additional financial resources', '17.4 Debt sustainability'],
      /* INR crore allocated across channels - drives the donut chart. */
      allocation: [
        { label: 'Grants & Aid', value: 2800 },
        { label: 'Concessional Loans', value: 2100 },
        { label: 'Private Capital', value: 3400 },
        { label: 'Domestic Revenue', value: 1200 },
        { label: 'Blended Finance', value: 500 }
      ],
      stat: { value: '₹10,000 Cr', label: 'tracked commitments' }
    },
    {
      id: 'technology',
      icon: '\u{1F4A1}',
      name: 'Technology',
      tagline: 'Transfer, not just invention',
      blurb: 'Clean energy, agri-tech and digital public infrastructure only reduce inequality when the knowledge travels with the hardware. Licensing terms and local maintenance capacity decide whether a transfer actually lands.',
      targets: ['17.6 Knowledge sharing', '17.7 Environmentally sound tech', '17.8 Technology bank'],
      allocation: [
        { label: 'Renewable Energy', value: 3100 },
        { label: 'Digital Infrastructure', value: 2600 },
        { label: 'Agri-Tech', value: 1800 },
        { label: 'Health-Tech', value: 1500 },
        { label: 'Water & Sanitation', value: 1000 }
      ],
      stat: { value: '412', label: 'active transfer agreements' }
    },
    {
      id: 'capacity',
      icon: '\u{1F393}',
      name: 'Capacity Building',
      tagline: 'Skills outlast funding cycles',
      blurb: 'A partnership that ends when the grant ends was never a partnership. Capacity building moves the expertise into local institutions so the work continues after the visiting team flies home.',
      targets: ['17.9 Capacity-building support', '17.18 Data & statistics capacity', '17.19 Measuring progress'],
      allocation: [
        { label: 'Teacher Training', value: 2200 },
        { label: 'Vocational Skilling', value: 2900 },
        { label: 'Public Administration', value: 1600 },
        { label: 'Data & Statistics', value: 1100 },
        { label: 'Entrepreneurship', value: 2200 }
      ],
      stat: { value: '1.4 M', label: 'people trained' }
    },
    {
      id: 'trade',
      icon: '\u{1F30D}',
      name: 'Trade',
      tagline: 'Rules that let smaller economies compete',
      blurb: 'Tariff structures, export subsidies and market access rules quietly decide which countries get to add value and which stay locked into raw exports. Fair trade is industrial policy wearing a friendlier name.',
      targets: ['17.10 Multilateral trading system', '17.11 Developing-country exports', '17.12 Duty-free market access'],
      allocation: [
        { label: 'Export Facilitation', value: 2400 },
        { label: 'Customs Modernisation', value: 1700 },
        { label: 'Standards & Certification', value: 2000 },
        { label: 'Producer Cooperatives', value: 2600 },
        { label: 'Logistics Corridors', value: 1300 }
      ],
      stat: { value: '₹42,000 Cr', label: 'facilitated trade value' }
    },
    {
      id: 'systemic',
      icon: '\u{1F91D}',
      name: 'Systemic Issues',
      tagline: 'Coherence, accountability, shared data',
      blurb: 'Policy coherence is the least glamorous target in SDG 17 and the one most often missed. Ministries that contradict each other cancel out the money spent by both. Multi-stakeholder governance is the fix.',
      targets: ['17.13 Macroeconomic stability', '17.14 Policy coherence', '17.16 Multi-stakeholder partnerships', '17.17 Effective partnerships'],
      allocation: [
        { label: 'Policy Coherence', value: 2500 },
        { label: 'Data Transparency', value: 2300 },
        { label: 'Civil Society Voice', value: 1900 },
        { label: 'Monitoring & Audit', value: 1800 },
        { label: 'Cross-Border Governance', value: 1500 }
      ],
      stat: { value: '96', label: 'coordination platforms' }
    }
  ];

  /* Regional partnership nodes. `pos` is [lon, lat] so the map projection can
     place each node where it would sit on a real world map. */
  var REGIONS = [
    {
      id: 'asia',
      name: 'Asia',
      pos: [88, 30],
      projects: 1840,
      partners: 312,
      funding: 4200, /* INR crore */
      reach: 68,
      categories: ['finance', 'technology', 'capacity', 'trade', 'systemic'],
      focus: 'Digital public infrastructure and climate-resilient agriculture',
      orgs: ['NITI Aayog', 'ASEAN Secretariat', 'Asian Development Bank', 'UNDP Asia-Pacific', 'SEWA Federation']
    },
    {
      id: 'africa',
      name: 'Africa',
      pos: [20, 2],
      projects: 1520,
      partners: 268,
      funding: 3100,
      reach: 74,
      categories: ['finance', 'capacity', 'trade', 'systemic'],
      focus: 'Off-grid energy access and continental free-trade implementation',
      orgs: ['African Union', 'African Development Bank', 'Smallholder Farmers Alliance', 'UNECA', 'M-KOPA']
    },
    {
      id: 'europe',
      name: 'Europe',
      pos: [12, 50],
      projects: 960,
      partners: 401,
      funding: 2600,
      reach: 41,
      categories: ['finance', 'technology', 'systemic'],
      focus: 'Climate finance commitments and technology transfer funding',
      orgs: ['European Commission', 'Nordic Development Fund', 'GIZ', 'Wellcome Trust', 'European Investment Bank']
    },
    {
      id: 'americas',
      name: 'Americas',
      pos: [-72, 5],
      projects: 1130,
      partners: 254,
      funding: 2900,
      reach: 53,
      categories: ['finance', 'technology', 'trade', 'systemic'],
      focus: 'Rainforest carbon markets and fair-trade producer cooperatives',
      orgs: ['CAF Development Bank', 'Fairtrade International', 'USAID', 'Fundación Avina', 'IDB Lab']
    },
    {
      id: 'oceania',
      name: 'Oceania',
      pos: [140, -25],
      projects: 380,
      partners: 96,
      funding: 800,
      reach: 82,
      categories: ['capacity', 'technology', 'systemic'],
      focus: 'Small-island resilience, ocean monitoring and disaster early warning',
      orgs: ['Pacific Islands Forum', 'SPREP', 'Australia DFAT', 'Ocean Data Network', 'Univ. of the South Pacific']
    }
  ];

  /* Partnership arcs drawn between regions on the map. */
  var LINKS = [
    ['europe', 'africa'], ['europe', 'asia'], ['asia', 'africa'],
    ['americas', 'africa'], ['americas', 'europe'], ['asia', 'oceania'],
    ['americas', 'asia'], ['africa', 'oceania']
  ];

  /* Low-poly continent outlines in [lon, lat] pairs. Deliberately abstract -
     the map is a diagram of partnership, not an atlas. */
  var LANDMASSES = [
    { id: 'north-america', points: [[-168,66],[-150,71],[-125,70],[-100,73],[-80,73],[-60,66],[-52,50],[-65,44],[-70,41],[-76,35],[-80,25],[-83,22],[-92,18],[-97,16],[-105,22],[-114,31],[-124,40],[-128,50],[-140,60],[-155,60],[-165,62]] },
    { id: 'greenland',     points: [[-45,60],[-25,70],[-20,80],[-35,83],[-58,82],[-55,70],[-50,62]] },
    { id: 'south-america', points: [[-79,5],[-70,12],[-60,10],[-50,0],[-35,-5],[-38,-15],[-48,-25],[-58,-35],[-62,-42],[-68,-52],[-75,-50],[-73,-40],[-70,-30],[-71,-18],[-77,-6],[-80,0]] },
    { id: 'africa',        points: [[-17,15],[-10,28],[0,35],[10,37],[20,32],[32,31],[35,22],[43,12],[51,12],[42,-2],[40,-15],[35,-25],[26,-34],[18,-34],[12,-18],[9,-1],[0,5],[-8,5],[-16,12]] },
    { id: 'eurasia',       points: [[-9,43],[-2,49],[4,53],[8,58],[14,56],[22,60],[30,62],[45,66],[60,68],[80,72],[100,75],[120,72],[140,70],[160,68],[178,66],[170,60],[160,58],[145,50],[135,44],[128,38],[122,30],[110,20],[105,10],[100,5],[95,15],[88,21],[80,10],[73,20],[68,24],[60,25],[55,28],[45,38],[36,36],[28,40],[20,38],[12,45],[6,44],[-2,37]] },
    { id: 'australia',     points: [[113,-22],[114,-32],[118,-35],[128,-32],[135,-34],[140,-38],[146,-39],[150,-35],[153,-28],[145,-18],[140,-17],[136,-12],[130,-12],[125,-14],[118,-20]] },
    { id: 'new-zealand',   points: [[172,-34],[178,-38],[174,-42],[168,-46],[166,-44],[170,-38]] },
    { id: 'madagascar',    points: [[49,-12],[50,-18],[47,-25],[44,-22],[44,-16]] },
    { id: 'japan',         points: [[130,31],[136,35],[141,41],[145,44],[142,38],[137,34],[132,30]] },
    { id: 'uk',            points: [[-5,50],[0,53],[-1,58],[-6,58],[-6,54]] },
    { id: 'indonesia',     points: [[95,5],[105,-2],[115,-8],[130,-3],[140,-4],[132,-8],[118,-10],[105,-8],[98,0]] }
  ];

  /* Stakeholder types for the Ecosystem Builder. Each carries the pillars it
     naturally strengthens plus a scoring weight. */
  var STAKEHOLDERS = [
    { id: 'govt',       icon: '\u{1F3DB}️',  name: 'Government',         strengths: ['finance', 'systemic', 'trade'],   weight: 22, note: 'Mandate, regulation and scale' },
    { id: 'ngo',        icon: '\u{1F91D}',        name: 'NGO',                strengths: ['capacity', 'systemic'],           weight: 16, note: 'Trust and last-mile delivery' },
    { id: 'enterprise', icon: '\u{1F3E2}',        name: 'Enterprise',         strengths: ['finance', 'technology', 'trade'], weight: 20, note: 'Capital and operational discipline' },
    { id: 'university', icon: '\u{1F393}',        name: 'University',         strengths: ['capacity', 'technology'],         weight: 15, note: 'Evidence, R&D and training pipelines' },
    { id: 'intl',       icon: '\u{1F310}',        name: 'Intl. Organisation', strengths: ['finance', 'systemic', 'trade'],   weight: 17, note: 'Convening power and standards' },
    { id: 'community',  icon: '\u{1F3D8}️',  name: 'Community Group',    strengths: ['capacity', 'systemic'],           weight: 18, note: 'Legitimacy and lived context' }
  ];

  /* Challenges the builder can target. */
  var CHALLENGES = [
    { id: 'energy',     icon: '⚡',     name: 'Clean Energy Access', needs: ['finance', 'technology'],  blurb: 'Bring reliable, affordable power to underserved districts.' },
    { id: 'education',  icon: '\u{1F4DA}',  name: 'Quality Education',   needs: ['capacity', 'systemic'],   blurb: 'Close learning gaps through teachers, materials and measurement.' },
    { id: 'water',      icon: '\u{1F4A7}',  name: 'Water & Sanitation',  needs: ['finance', 'capacity'],    blurb: 'Safe water and sanitation infrastructure communities can maintain.' },
    { id: 'livelihood', icon: '\u{1F33E}',  name: 'Rural Livelihoods',   needs: ['trade', 'capacity'],      blurb: 'Raise smallholder incomes through fair market access.' },
    { id: 'health',     icon: '\u{1FA7A}',  name: 'Healthcare Delivery', needs: ['technology', 'capacity'], blurb: 'Extend primary care and diagnostics into remote geographies.' },
    { id: 'climate',    icon: '\u{1F30F}',  name: 'Climate Resilience',  needs: ['finance', 'systemic'],    blurb: 'Prepare vulnerable regions for floods, heat and crop failure.' }
  ];

  /* Budget tiers for the builder, in rupees. */
  var BUDGET_TIERS = [
    { value: 100000,     label: '₹1 Lakh',    scale: 0.42 },
    { value: 10000000,   label: '₹1 Crore',   scale: 0.58 },
    { value: 50000000,   label: '₹5 Crore',   scale: 0.72 },
    { value: 100000000,  label: '₹10 Crore',  scale: 0.84 },
    { value: 500000000,  label: '₹50 Crore',  scale: 0.93 },
    { value: 1000000000, label: '₹100 Crore', scale: 1.00 }
  ];

  /* Role-based learning paths for the Capacity Building pillar. */
  var LEARNING_PATHS = {
    student: {
      icon: '\u{1F9D1}‍\u{1F393}', name: 'Student',
      steps: ['SDG literacy foundations', 'Data analysis for impact', 'Campus partnership project', 'Youth policy advocacy', 'Lead a community pilot']
    },
    teacher: {
      icon: '\u{1F9D1}‍\u{1F3EB}', name: 'Teacher',
      steps: ['Embed SDGs in curriculum', 'Project-based learning design', 'Inclusive classroom practice', 'Mentor a student cohort', 'Train fellow educators']
    },
    ngo: {
      icon: '\u{1F91D}', name: 'NGO Worker',
      steps: ['Community needs assessment', 'Monitoring and evaluation basics', 'Grant writing and reporting', 'Multi-stakeholder facilitation', 'Scale a proven model']
    },
    govt: {
      icon: '\u{1F3DB}️', name: 'Govt. Official',
      steps: ['SDG indicator frameworks', 'Budget tagging for SDGs', 'Cross-ministry coordination', 'Open data publication', 'Policy coherence review']
    },
    entrepreneur: {
      icon: '\u{1F680}', name: 'Entrepreneur',
      steps: ['Impact business modelling', 'Blended finance instruments', 'Supply-chain due diligence', 'Impact measurement standards', 'Raise a sustainability round']
    }
  };

  /* Quiz bank for the Action Centre. */
  var QUIZ = [
    {
      q: 'What is the central idea of SDG 17?',
      a: ['Ending poverty through aid alone', 'Strengthening the means of implementation and global partnership', 'Protecting marine ecosystems', 'Guaranteeing universal healthcare'],
      correct: 1,
      why: 'SDG 17 is the enabling goal. It supplies the finance, technology, capacity, trade and policy coherence the other sixteen goals depend on.'
    },
    {
      q: 'Which of these is NOT one of the five SDG 17 pillars?',
      a: ['Finance', 'Technology', 'Military cooperation', 'Trade'],
      correct: 2,
      why: 'The five pillars are Finance, Technology, Capacity Building, Trade and Systemic Issues. Military cooperation sits outside the framework.'
    },
    {
      q: 'Why does capacity building matter more than one-off funding?',
      a: ['It is cheaper to deliver', 'Skills and institutions outlast the grant cycle', 'It requires fewer partners', 'It avoids the need for measurement'],
      correct: 1,
      why: 'Money runs out on a schedule. Trained people and functioning institutions keep the work going after the funding window closes.'
    },
    {
      q: 'Target 17.14 asks countries to enhance which of the following?',
      a: ['Policy coherence for sustainable development', 'Naval trade routes', 'Private equity returns', 'Tourism revenue'],
      correct: 0,
      why: 'Ministries pulling in different directions cancel out each other’s spending. Coherence makes the same budget go further.'
    },
    {
      q: 'What makes a multi-stakeholder partnership genuinely effective?',
      a: ['A single dominant funder', 'Shared goals, clear accountability and community voice', 'Keeping the scope narrow and private', 'Avoiding government involvement'],
      correct: 1,
      why: 'Target 17.17 is explicit: effective partnerships build on shared vision, defined responsibilities and the participation of those affected.'
    },
    {
      q: 'Duty-free market access for least-developed countries falls under which pillar?',
      a: ['Technology', 'Trade', 'Finance', 'Capacity Building'],
      correct: 1,
      why: 'Target 17.12 sits in the Trade pillar. It removes tariff barriers so smaller economies can actually reach global markets.'
    }
  ];

  /* Badge definitions - unlocked through interaction, stored in localStorage. */
  var BADGES = [
    { id: 'finance-explorer',     icon: '\u{1F4B0}',       name: 'Finance Explorer',     hint: 'Run the finance simulator' },
    { id: 'tech-innovator',       icon: '\u{1F4A1}',       name: 'Tech Innovator',       hint: 'Open the Technology pillar' },
    { id: 'skill-builder',        icon: '\u{1F393}',       name: 'Skill Builder',        hint: 'Build a learning path' },
    { id: 'fair-trade',           icon: '\u{1F30D}',       name: 'Fair Trade Advocate',  hint: 'Run the fair trade simulator' },
    { id: 'partnership-champion', icon: '\u{1F91D}',       name: 'Partnership Champion', hint: 'Generate a strategy report' },
    { id: 'globe-trotter',        icon: '\u{1F5FA}️', name: 'Globe Trotter',        hint: 'Open every region on the map' },
    { id: 'quiz-master',          icon: '\u{1F9E0}',       name: 'Quiz Master',          hint: 'Score 5 of 6 on the quiz' },
    { id: 'pledge-maker',         icon: '✍️',    name: 'Pledge Maker',         hint: 'Post a pledge to the wall' }
  ];

  /* Seed pledges so the wall never looks empty during a live demo. */
  var SEED_PLEDGES = [
    { name: 'Ananya R.',   role: 'Student',      text: 'I will run a monthly SDG literacy circle in my hostel block and publish what we learn.', seeded: true },
    { name: 'Karthik M.',  role: 'Entrepreneur', text: 'Our startup will publish a supplier sustainability scorecard before the next funding round.', seeded: true },
    { name: 'Dr. Meera S.', role: 'Teacher',     text: 'Every project in my class this term will map to a measurable SDG indicator.', seeded: true },
    { name: 'Sudharsanan V.', role: 'Student',   text: 'I am building an open dataset of local water quality readings for our district panchayat.', seeded: true }
  ];

  /* Live poll for audience participation. */
  var POLL = {
    question: 'Which pillar should your region prioritise first?',
    options: [
      { id: 'finance',    label: 'Finance',           base: 24 },
      { id: 'technology', label: 'Technology',        base: 31 },
      { id: 'capacity',   label: 'Capacity Building', base: 38 },
      { id: 'trade',      label: 'Trade',             base: 19 },
      { id: 'systemic',   label: 'Systemic Issues',   base: 22 }
    ]
  };

  /* "Why partnerships matter" - the six cards in the About section. */
  var WHY_CARDS = [
    { icon: '\u{1F517}',    title: 'No goal stands alone',       text: 'Sixteen goals describe outcomes. The seventeenth describes how any of them get paid for, staffed and measured.' },
    { icon: '\u{1F4C9}',    title: 'The financing gap is real',  text: 'Developing economies face an annual shortfall estimated in the trillions of dollars. No single actor closes it.' },
    { icon: '\u{1F504}',    title: 'Knowledge has to travel',    text: 'Technology that stays where it was invented widens inequality instead of narrowing it.' },
    { icon: '⚖️', title: 'Rules decide winners',       text: 'Trade terms and tariff structures shape development outcomes more quietly, and more powerfully, than aid does.' },
    { icon: '\u{1F4CA}',    title: 'What is not measured drifts', text: 'Many countries lack adequate data for half the SDG indicators. Statistical capacity is development capacity.' },
    { icon: '\u{1F331}',    title: 'Local ownership sustains',   text: 'Programmes designed with communities survive the funding cliff. Programmes designed for them rarely do.' }
  ];

  global.SDG_DATA = {
    PILLARS: PILLARS,
    REGIONS: REGIONS,
    LINKS: LINKS,
    LANDMASSES: LANDMASSES,
    STAKEHOLDERS: STAKEHOLDERS,
    CHALLENGES: CHALLENGES,
    BUDGET_TIERS: BUDGET_TIERS,
    LEARNING_PATHS: LEARNING_PATHS,
    QUIZ: QUIZ,
    BADGES: BADGES,
    SEED_PLEDGES: SEED_PLEDGES,
    POLL: POLL,
    WHY_CARDS: WHY_CARDS
  };
})(window);
