import { JobListing, Category } from './types';

export const CATEGORIES: Category[] = [
  {
    id: 'all',
    name: 'All Jobs',
    icon: 'Briefcase',
    description: 'Browse all available local micro-jobs'
  },
  {
    id: 'manual',
    name: 'Manual Work',
    icon: 'Hammer',
    description: 'Yard work, moving, cleaning, physical help'
  },
  {
    id: 'school',
    name: 'School Help',
    icon: 'GraduationCap',
    description: 'Tutor, homework help, assignments, exam prep'
  },
  {
    id: 'creative',
    name: 'Creative & Tech',
    icon: 'Palette',
    description: 'Flyer design, data entry, typing, basic admin'
  },
  {
    id: 'errands',
    name: 'Errands',
    icon: 'CheckSquare',
    description: 'Water collection, grocery runs, delivery, waiting in line'
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'Layers',
    description: 'Misc tasks and unique gigs'
  }
];

export const PRESEEDED_LISTINGS: JobListing[] = [
  {
    id: 'job-1',
    title: 'Need help moving solar batteries and panels',
    description: 'Need one strong person to help carry 4 solar batteries and 6 panels from my garage to the balcony. Heavy lifting is required but it should take less than an hour.',
    payment: 15,
    paymentType: 'fixed',
    category: 'manual',
    location: 'Mt Pleasant, Harare',
    phone: '+263772000001',
    employerName: 'Tinashe M.',
    isFeatured: true,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 mins ago
  },
  {
    id: 'job-2',
    title: 'Flyer Design for New Local Car Wash',
    description: 'Looking for a simple, eye-catching flyer for my newly opened car wash in Borrowdale. Need digital copy sent via WhatsApp. I will pay after seeing the first draft. Can be done completely from your phone or laptop.',
    payment: 10,
    paymentType: 'fixed',
    category: 'creative',
    location: 'Borrowdale, Harare',
    phone: '+263783000002',
    employerName: 'Anesu G.',
    isFeatured: true,
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString() // 2 hours ago
  },
  {
    id: 'job-3',
    title: 'Yard Cleaning & Grass Slashing',
    description: 'Need someone to slash tall grass in the backyard and sweep up the leaves. Slashing tool (slash) is available. Should take about 3-4 hours max. Will provide lunch and cold water.',
    payment: 8,
    paymentType: 'fixed',
    category: 'manual',
    location: 'Avondale, Harare',
    phone: '+263719000003',
    employerName: 'Gogo Chipo',
    isFeatured: false,
    createdAt: new Date(Date.now() - 240 * 60 * 1000).toISOString() // 4 hours ago
  },
  {
    id: 'job-4',
    title: 'Grade 7 Shona Language Tutoring',
    description: 'Looking for an energetic tutor to spend 2 hours with my son explaining grade 7 Shona comprehension and composition tips before his exams next month. High school student or graduate preferred.',
    payment: 12,
    paymentType: 'fixed',
    category: 'school',
    location: 'Chitungwiza, Unit K',
    phone: '+263771000004',
    employerName: 'Mrs. Moyo',
    isFeatured: false,
    createdAt: new Date(Date.now() - 360 * 60 * 1000).toISOString() // 6 hours ago
  },
  {
    id: 'job-5',
    title: 'Water Fetching (Bring your own barrow)',
    description: 'We do not have municipal water right now. Need someone to fetch water from the community borehole 500m away. Require five 20-litre drums filled. I have the drums, please bring your wheelbarrow.',
    payment: 5,
    paymentType: 'fixed',
    category: 'errands',
    location: 'Ruwa, Harare East',
    phone: '+263732000005',
    employerName: 'Farai K.',
    isFeatured: false,
    createdAt: new Date(Date.now() - 720 * 60 * 1000).toISOString() // 12 hours ago
  },
  {
    id: 'job-6',
    title: 'Type handwritten notes into Microsoft Word',
    description: 'Have 12 pages of chemistry handwritten notes that need to be typed up in MS Word. Needs to be clear and formatted. Prefer someone with a fast typing speed on a computer. Send me a sample sentence first.',
    payment: 6,
    paymentType: 'fixed',
    category: 'creative',
    location: 'CBD, Bulawayo',
    phone: '+263774000006',
    employerName: 'Sihle N.',
    isFeatured: false,
    createdAt: new Date(Date.now() - 1440 * 60 * 1000).toISOString() // 1 day ago
  },
  {
    id: 'job-7',
    title: 'House Move Loading & Packing Helper',
    description: 'Moving houses this Saturday. Need someone to help load sofas, beds, fridge, and boxes into a 3-tonne truck. There will be 2 other people helping. Free snacks/drinks.',
    payment: 20,
    paymentType: 'fixed',
    category: 'manual',
    location: 'Hillside, Bulawayo',
    phone: '+263775000007',
    employerName: 'Bongani M.',
    isFeatured: false,
    createdAt: new Date(Date.now() - 1800 * 60 * 1000).toISOString() // 1.25 days ago
  }
];
