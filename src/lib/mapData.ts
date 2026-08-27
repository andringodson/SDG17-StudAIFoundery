export interface Region {
  id: string;
  name: string;
  pos: [number, number]; // [lon, lat]
  projects: number;
  partners: number;
  funding: number; // ₹ crore
  reach: number; // %
  categories: string[];
  focus: string;
  orgs: string[];
}

export const REGIONS: Region[] = [
  {
    id: 'asia', name: 'Asia', pos: [88, 30], projects: 1840, partners: 312, funding: 4200, reach: 68,
    categories: ['finance', 'technology', 'capacity', 'trade', 'systemic'],
    focus: 'Digital public infrastructure and climate-resilient agriculture',
    orgs: ['NITI Aayog', 'ASEAN Secretariat', 'Asian Development Bank', 'UNDP Asia-Pacific']
  },
  {
    id: 'africa', name: 'Africa', pos: [20, 2], projects: 1520, partners: 268, funding: 3100, reach: 74,
    categories: ['finance', 'capacity', 'trade', 'systemic'],
    focus: 'Off-grid energy access and continental free-trade implementation',
    orgs: ['African Union', 'African Development Bank', 'Smallholder Farmers Alliance']
  },
  {
    id: 'europe', name: 'Europe', pos: [12, 50], projects: 960, partners: 401, funding: 2600, reach: 41,
    categories: ['finance', 'technology', 'systemic'],
    focus: 'Climate finance commitments and technology transfer funding',
    orgs: ['European Commission', 'Nordic Development Fund', 'GIZ']
  },
  {
    id: 'americas', name: 'Americas', pos: [-72, 5], projects: 1130, partners: 254, funding: 2900, reach: 53,
    categories: ['finance', 'technology', 'trade', 'systemic'],
    focus: 'Rainforest carbon markets and fair-trade producer cooperatives',
    orgs: ['CAF Development Bank', 'Fairtrade International', 'USAID']
  },
  {
    id: 'oceania', name: 'Oceania', pos: [140, -25], projects: 380, partners: 96, funding: 800, reach: 82,
    categories: ['capacity', 'technology', 'systemic'],
    focus: 'Small-island resilience, ocean monitoring and disaster early warning',
    orgs: ['Pacific Islands Forum', 'SPREP', 'Australia DFAT']
  }
];

export const LINKS: [string, string][] = [
  ['europe', 'africa'], ['europe', 'asia'], ['asia', 'africa'],
  ['americas', 'africa'], ['americas', 'europe'], ['asia', 'oceania']
];

export const LANDMASSES: { id: string; points: [number, number][] }[] = [
  { id: 'north-america', points: [[-168,66],[-150,71],[-125,70],[-100,73],[-80,73],[-60,66],[-52,50],[-65,44],[-76,35],[-80,25],[-97,16],[-114,31],[-128,50],[-155,60]] },
  { id: 'south-america', points: [[-79,5],[-60,10],[-35,-5],[-48,-25],[-62,-42],[-75,-50],[-70,-30],[-77,-6]] },
  { id: 'africa', points: [[-17,15],[0,35],[20,32],[35,22],[51,12],[40,-15],[26,-34],[9,-1],[-16,12]] },
  { id: 'eurasia', points: [[-9,43],[4,53],[22,60],[45,66],[80,72],[120,72],[160,68],[170,60],[135,44],[110,20],[95,15],[73,20],[45,38],[12,45]] },
  { id: 'australia', points: [[113,-22],[118,-35],[135,-34],[146,-39],[153,-28],[136,-12],[118,-20]] }
];

export const PILLARS = [
  { id: 'finance', name: 'Finance', icon: '💰' },
  { id: 'technology', name: 'Technology', icon: '💡' },
  { id: 'capacity', name: 'Capacity Building', icon: '🎓' },
  { id: 'trade', name: 'Trade', icon: '🌍' },
  { id: 'systemic', name: 'Systemic Issues', icon: '🤝' }
];
