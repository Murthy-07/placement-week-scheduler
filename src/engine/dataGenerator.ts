import { Company, CompanyPanel, CompanyTier, PlacementConfig, DEFAULT_PLACEMENT_CONFIG, PlacementDay, Room, Student, Timeslot } from '../types';

// Deterministic Pseudo-Random Number Generator (Mulberry32)
export class PRNG {
  private s: number;

  constructor(seed: number = 42) {
    this.s = seed;
  }

  public next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max + 1));
  }

  public nextGaussian(mean: number = 0, stdDev: number = 1): number {
    let u1 = this.next();
    let u2 = this.next();
    while (u1 <= 1e-15) u1 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
}

const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Advait', 'Akash', 'Ananya', 'Aniket', 'Anushka', 'Arjun', 'Arya', 'Ayush',
  'Bhavya', 'Chetan', 'Dev', 'Dia', 'Divya', 'Gaurav', 'Harsh', 'Isha', 'Ishaan', 'Jaya',
  'Kabir', 'Karan', 'Kavya', 'Krish', 'Manish', 'Meera', 'Neha', 'Nikhil', 'Nisha', 'Omkar',
  'Pooja', 'Pranav', 'Priya', 'Rahul', 'Rhea', 'Rishi', 'Rohan', 'Sakshi', 'Samarth', 'Sanjay',
  'Sanvi', 'Shreya', 'Siddharth', 'Sneha', 'Tanvi', 'Tarun', 'Utkarsh', 'Varun', 'Vidya', 'Yash'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Mehta', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Rao', 'Singh',
  'Kumar', 'Joshi', 'Bose', 'Chakraborty', 'Banerjee', 'Mishra', 'Pandey', 'Deshmukh', 'Kulkarni', 'Desai'
];

const BRANCHES: Array<'CS' | 'IT' | 'ECE' | 'EE' | 'ME'> = ['CS', 'IT', 'ECE', 'EE', 'ME'];

export interface Dataset {
  companies: Company[];
  students: Student[];
  rooms: Room[];
  placementDays: PlacementDay[];
  timeslots: Timeslot[];
  seed: number;
  config?: PlacementConfig;
}

export function generatePlacementDataset(seedOrConfig: number | Partial<PlacementConfig> = 42): Dataset {
  const config: PlacementConfig = typeof seedOrConfig === 'number'
    ? { ...DEFAULT_PLACEMENT_CONFIG, seed: seedOrConfig }
    : { ...DEFAULT_PLACEMENT_CONFIG, ...seedOrConfig };

  const rng = new PRNG(config.seed);

  // 1. Generate Configured Rooms
  const rooms: Room[] = [];
  for (let i = 1; i <= config.roomCount; i++) {
    const blockLetter = String.fromCharCode(65 + Math.floor((i - 1) / 20));
    const num = 100 + (((i - 1) % 20) + 1);
    rooms.push({
      id: i,
      roomNumber: `${blockLetter}-${num}`,
      building: `Academic Block ${blockLetter}`,
      isAvailable: true,
    });
  }

  // 2. Generate Configured Placement Days
  const placementDays: PlacementDay[] = [];
  const baseDate = new Date('2026-09-01T00:00:00Z');
  for (let d = 1; d <= config.placementDays; d++) {
    const dDate = new Date(baseDate);
    dDate.setDate(baseDate.getDate() + (d - 1));
    placementDays.push({
      id: d,
      dayNumber: d,
      date: dDate.toISOString().split('T')[0],
      description: `Placement Day ${d}`,
    });
  }

  // 3. Generate Timeslots from StartTime to EndTime with duration & break
  const timeslots: Timeslot[] = [];
  let slotGlobalId = 1;

  const [startHourStr, startMinStr] = (config.startTime || '09:00').split(':').map(Number);
  const [endHourStr, endMinStr] = (config.endTime || '17:00').split(':').map(Number);
  const startTotalMinutes = startHourStr * 60 + startMinStr;
  const endTotalMinutes = endHourStr * 60 + endMinStr;
  const slotDuration = config.interviewDurationMinutes || 30;
  const breakDuration = config.breakDurationMinutes || 0;
  const stepMinutes = slotDuration + breakDuration;

  const formatDisplay = (h: number, m: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  for (const day of placementDays) {
    let currentMins = startTotalMinutes;
    let sIndex = 0;

    while (currentMins + slotDuration <= endTotalMinutes) {
      const curH = Math.floor(currentMins / 60);
      const curM = currentMins % 60;
      const endMins = currentMins + slotDuration;
      const nxtH = Math.floor(endMins / 60);
      const nxtM = endMins % 60;

      const startH = String(curH).padStart(2, '0');
      const startM = String(curM).padStart(2, '0');
      const endH = String(nxtH).padStart(2, '0');
      const endM = String(nxtM).padStart(2, '0');

      timeslots.push({
        id: slotGlobalId++,
        dayId: day.id,
        slotIndex: sIndex++,
        startTime: `${startH}:${startM}`,
        endTime: `${endH}:${endM}`,
        displayTime: `${formatDisplay(curH, curM)} - ${formatDisplay(nxtH, nxtM)}`,
      });

      currentMins += stepMinutes;
    }
  }

  // 4. Generate Companies across Tiers
  const baseCompanyConfigs = [
    // Tier 1 (5 Tech Giants) - Cutoff 8.5, 2-4 panels
    { name: 'Google Core Systems', tier: 1 as const, minCgpa: 8.75, panels: 3, duration: slotDuration },
    { name: 'Microsoft Azure Engineering', tier: 1 as const, minCgpa: 8.50, panels: 3, duration: slotDuration },
    { name: 'Meta Reality Labs', tier: 1 as const, minCgpa: 8.80, panels: 2, duration: slotDuration },
    { name: 'Amazon Cloud Technologies', tier: 1 as const, minCgpa: 8.40, panels: 4, duration: slotDuration },
    { name: 'Apple Platform Architecture', tier: 1 as const, minCgpa: 8.90, panels: 2, duration: slotDuration },

    // Tier 2 (10 High-Growth Product & Tech) - Cutoff 7.0-8.0, 3-4 panels
    { name: 'Uber Logistics Tech', tier: 2 as const, minCgpa: 7.80, panels: 3, duration: slotDuration },
    { name: 'Adobe Creative Intelligence', tier: 2 as const, minCgpa: 7.50, panels: 3, duration: slotDuration },
    { name: 'NVIDIA Deep Learning Systems', tier: 2 as const, minCgpa: 8.00, panels: 3, duration: slotDuration },
    { name: 'Salesforce Core Cloud', tier: 2 as const, minCgpa: 7.40, panels: 3, duration: slotDuration },
    { name: 'Oracle Database Engineering', tier: 2 as const, minCgpa: 7.20, panels: 4, duration: slotDuration },
    { name: 'Cisco Enterprise Networking', tier: 2 as const, minCgpa: 7.10, panels: 3, duration: slotDuration },
    { name: 'Stripe Payments Infra', tier: 2 as const, minCgpa: 8.10, panels: 2, duration: slotDuration },
    { name: 'Intel High Performance Silicon', tier: 2 as const, minCgpa: 7.30, panels: 3, duration: slotDuration },
    { name: 'Spotify Audio Media Services', tier: 2 as const, minCgpa: 7.60, panels: 3, duration: slotDuration },
    { name: 'Qualcomm Wireless R&D', tier: 2 as const, minCgpa: 7.50, panels: 3, duration: slotDuration },

    // Tier 3 (20 Mass Recruiters & Enterprise Services) - Cutoff 6.0-6.8, 4-8 panels
    { name: 'TCS Digital Innovation', tier: 3 as const, minCgpa: 6.50, panels: 8, duration: slotDuration },
    { name: 'Infosys Special Technologies', tier: 3 as const, minCgpa: 6.40, panels: 8, duration: slotDuration },
    { name: 'Wipro Turbo Consulting', tier: 3 as const, minCgpa: 6.20, panels: 7, duration: slotDuration },
    { name: 'Cognizant GenC Elevate', tier: 3 as const, minCgpa: 6.30, panels: 7, duration: slotDuration },
    { name: 'Accenture Advanced App Services', tier: 3 as const, minCgpa: 6.50, panels: 8, duration: slotDuration },
    { name: 'Capgemini Digital Cloud', tier: 3 as const, minCgpa: 6.20, panels: 6, duration: slotDuration },
    { name: 'LTI Mindtree Core Solutions', tier: 3 as const, minCgpa: 6.40, panels: 6, duration: slotDuration },
    { name: 'Deloitte Tech Advisory', tier: 3 as const, minCgpa: 6.80, panels: 6, duration: slotDuration },
    { name: 'PwC Technology Consulting', tier: 3 as const, minCgpa: 6.70, panels: 6, duration: slotDuration },
    { name: 'EY GDS Digital Labs', tier: 3 as const, minCgpa: 6.50, panels: 6, duration: slotDuration },
    { name: 'KPMG Tech Risk Engineering', tier: 3 as const, minCgpa: 6.60, panels: 5, duration: slotDuration },
    { name: 'IBM Hybrid Cloud Platforms', tier: 3 as const, minCgpa: 6.80, panels: 6, duration: slotDuration },
    { name: 'Dell Technologies Global Support', tier: 3 as const, minCgpa: 6.50, panels: 5, duration: slotDuration },
    { name: 'HCL Tech Enterprise Systems', tier: 3 as const, minCgpa: 6.10, panels: 6, duration: slotDuration },
    { name: 'Tech Mahindra Digital Solutions', tier: 3 as const, minCgpa: 6.00, panels: 6, duration: slotDuration },
    { name: 'Honeywell Connected Enterprise', tier: 3 as const, minCgpa: 6.80, panels: 5, duration: slotDuration },
    { name: 'Bosch Mobility Solutions', tier: 3 as const, minCgpa: 6.70, panels: 5, duration: slotDuration },
    { name: 'Texas Instruments Embedded', tier: 3 as const, minCgpa: 6.90, panels: 4, duration: slotDuration },
    { name: 'AMD Computing Architectures', tier: 3 as const, minCgpa: 6.90, panels: 4, duration: slotDuration },
    { name: 'Samsung R&D Institute', tier: 3 as const, minCgpa: 6.80, panels: 5, duration: slotDuration },
  ];

  // Extended procedural names if companyCount > 35
  const EXTENDED_NAMES = [
    'Palantir Applied AI', 'Databricks Lakehouse Tech', 'Snowflake Cloud Analytics',
    'Atlassian Cloud Systems', 'Shopify Merchant Solutions', 'Twilio Messaging Infra',
    'Airbnb Platform Engineering', 'Pinterest Visual Graph', 'Snap Augmented Reality',
    'Block Financial Services', 'Dropbox Distributed File Tech', 'GitLab DevOps Core',
    'Elastic Cloud Search', 'MongoDB Distributed Databases', 'HubSpot Growth Platforms'
  ];

  const targetCompanyCount = config.companyCount;
  const companyConfigs: typeof baseCompanyConfigs = [];

  for (let i = 0; i < targetCompanyCount; i++) {
    if (i < baseCompanyConfigs.length) {
      companyConfigs.push(baseCompanyConfigs[i]);
    } else {
      const extIdx = (i - baseCompanyConfigs.length) % EXTENDED_NAMES.length;
      const extName = `${EXTENDED_NAMES[extIdx]} ${Math.floor((i - baseCompanyConfigs.length) / EXTENDED_NAMES.length) + 1}`;
      const tier: CompanyTier = i % 5 === 0 ? 1 : i % 3 === 0 ? 2 : 3;
      const minCgpa = tier === 1 ? 8.5 : tier === 2 ? 7.5 : 6.5;
      const panels = tier === 1 ? 2 : tier === 2 ? 3 : 5;
      companyConfigs.push({
        name: extName,
        tier,
        minCgpa,
        panels,
        duration: slotDuration,
      });
    }
  }

  const companies: Company[] = [];
  let panelIdCounter = 1;

  for (let i = 0; i < companyConfigs.length; i++) {
    const cfg = companyConfigs[i];
    const compId = i + 1;
    const panels: CompanyPanel[] = [];

    // If config.panelCount is provided and overrides per-company panels
    let numPanels: number;
    if (config.panelCount !== undefined && config.panelCount > 0) {
      const basePanels = Math.floor(config.panelCount / targetCompanyCount);
      const remainder = config.panelCount % targetCompanyCount;
      numPanels = Math.max(1, basePanels + (i < remainder ? 1 : 0));
    } else {
      numPanels = cfg.panels;
    }

    for (let p = 1; p <= numPanels; p++) {
      panels.push({
        id: panelIdCounter++,
        companyId: compId,
        panelName: `${cfg.name.split(' ')[0]} Panel ${String.fromCharCode(64 + p)}`,
        isAvailable: true,
      });
    }

    companies.push({
      id: compId,
      name: cfg.name,
      minCgpa: cfg.minCgpa,
      tier: cfg.tier,
      interviewDurationMinutes: cfg.duration,
      panels,
      shortlistedStudentIds: [],
    });
  }

  // 5. Generate Configured Students
  const students: Student[] = [];
  for (let s = 1; s <= config.studentCount; s++) {
    const fName = FIRST_NAMES[rng.nextInt(0, FIRST_NAMES.length - 1)];
    const lName = LAST_NAMES[rng.nextInt(0, LAST_NAMES.length - 1)];
    const branch = BRANCHES[rng.nextInt(0, BRANCHES.length - 1)];

    // Realistic Gaussian distribution: mean 7.6, stdDev 1.05, clamped between 5.2 and 9.95
    let rawCgpa = rng.nextGaussian(7.6, 1.05);
    rawCgpa = Math.max(5.2, Math.min(9.95, rawCgpa));
    const cgpa = Number(rawCgpa.toFixed(2));

    students.push({
      id: s,
      name: `${fName} ${lName}`,
      email: `${fName.toLowerCase()}.${lName.toLowerCase()}${s}@university.edu`,
      cgpa,
      branch,
      shortlistedCompanyIds: [],
      status: 'AVAILABLE',
    });
  }

  // 6. Generate Shortlists (Realistic Bottleneck Overlap)
  for (const student of students) {
    for (const company of companies) {
      if (student.cgpa >= company.minCgpa) {
        let prob = 0.0;
        if (company.tier === 1) {
          prob = student.cgpa >= 9.0 ? 0.45 : student.cgpa >= 8.6 ? 0.25 : 0.08;
        } else if (company.tier === 2) {
          prob = student.cgpa >= 8.5 ? 0.60 : student.cgpa >= 7.8 ? 0.40 : 0.20;
        } else {
          prob = student.cgpa >= 8.0 ? 0.70 : student.cgpa >= 7.0 ? 0.60 : 0.45;
        }

        if (rng.next() < prob) {
          student.shortlistedCompanyIds.push(company.id);
          company.shortlistedStudentIds.push(student.id);
        }
      }
    }

    // Ensure every eligible student has at least 1 shortlist if possible
    if (student.shortlistedCompanyIds.length === 0) {
      const eligible = companies.filter(c => student.cgpa >= c.minCgpa);
      if (eligible.length > 0) {
        const picked = eligible[rng.nextInt(0, eligible.length - 1)];
        student.shortlistedCompanyIds.push(picked.id);
        picked.shortlistedStudentIds.push(student.id);
      }
    }
  }

  return {
    companies,
    students,
    rooms,
    placementDays,
    timeslots,
    seed: config.seed,
    config,
  };
}
