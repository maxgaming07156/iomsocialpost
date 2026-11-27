import {
  ActivityItem,
  MediaAsset,
  NewsStory,
  SocialPost,
  StudioSettings,
} from "@/types/studio";

export const DEMO_STORIES: NewsStory[] = [
  {
    id: "IOM-2026-104",
    headline:
      "Steam Packet confirms winter timetable adjustments for Douglas–Heysham sailings",
    summary:
      "The Isle of Man Steam Packet Company has published updated departure windows for late November and December crossings between Douglas and Heysham to improve reliability during seasonal Irish Sea swells.",
    source: "Manx Radio",
    sourceUrl: "https://example.com/manx-radio/steam-packet-timetable",
    category: "Transport",
    publishedAt: "2026-11-26T09:15:00Z",
    relevanceScore: 94,
    aiDecision: "Publish",
    aiProvider: "Gemini",
    aiReasoning:
      "High island-wide commuter and travel impact. Strong engagement potential for residents and off-island visitors.",
    processingStatus: "Drafts Generated",
    location: "Douglas",
  },
  {
    id: "IOM-2026-103",
    headline:
      "Douglas Promenade heritage tramway winter maintenance schedule announced",
    summary:
      "Department of Infrastructure engineers will carry out track bed inspections and sleeper replacements along the Loch Promenade section ahead of the 2027 visitor season.",
    source: "Isle of Man Today",
    sourceUrl: "https://example.com/iomtoday/tramway-maintenance",
    category: "Infrastructure",
    publishedAt: "2026-11-26T08:30:00Z",
    relevanceScore: 86,
    aiDecision: "Publish",
    aiProvider: "Gemini",
    aiReasoning:
      "Relevant to Douglas motorists, businesses, and heritage transport followers.",
    processingStatus: "Awaiting Review",
    location: "Douglas",
  },
  {
    id: "IOM-2026-102",
    headline:
      "Tynwald committee opens public consultation on coastal flood resilience",
    summary:
      "Residents in Ramsey, Peel, and Castletown are invited to submit feedback on proposed sea-wall upgrades and harbour drainage improvements before January.",
    source: "Isle of Man Gov",
    sourceUrl: "https://example.com/gov-im/coastal-consultation",
    category: "Policy & Civic",
    publishedAt: "2026-11-25T16:45:00Z",
    relevanceScore: 89,
    aiDecision: "Publish",
    aiProvider: "Gemini",
    aiReasoning:
      "Direct civic relevance across three coastal towns; ideal for a clear community explainer carousel.",
    processingStatus: "Approved",
    location: "Ramsey & Peel",
  },
  {
    id: "IOM-2026-101",
    headline:
      "Manx National Heritage unveils winter evening lecture series at Manx Museum",
    summary:
      "A six-part programme exploring Viking burial sites, Manx maritime trade, and Victorian architecture will run every Thursday evening through February.",
    source: "3FM",
    sourceUrl: "https://example.com/3fm/manx-museum-lectures",
    category: "Culture & Events",
    publishedAt: "2026-11-25T14:10:00Z",
    relevanceScore: 78,
    aiDecision: "Review",
    aiProvider: "Groq",
    aiReasoning:
      "Evaluated via Groq fallback during rate-limit window. Good local events fit; editor to confirm slot availability.",
    processingStatus: "Awaiting Review",
    location: "Douglas",
  },
  {
    id: "IOM-2026-100",
    headline:
      "TT 2027 paddock hospitality & grandstand early-bird allocation goes live",
    summary:
      "Organisers have released the first wave of grandstand passes and VIP hospitality packages for next summer's Isle of Man TT Races.",
    source: "Isle of Man TT Official",
    sourceUrl: "https://example.com/iomtt/2027-hospitality",
    category: "Motorsport",
    publishedAt: "2026-11-25T11:00:00Z",
    relevanceScore: 96,
    aiDecision: "Publish",
    aiProvider: "Gemini",
    aiReasoning:
      "Flagship Manx sporting event with high save/share rate across both Instagram and TikTok.",
    processingStatus: "Approved",
    location: "Noble's Park",
  },
  {
    id: "IOM-2026-099",
    headline:
      "Peel harbour Christmas markets confirm 45 local artisan & food stalls",
    summary:
      "Independent Manx bakers, ceramicists, and local breweries will gather along Peel breakwater for the annual festive weekend market.",
    source: "Manx Radio",
    sourceUrl: "https://example.com/manx-radio/peel-christmas-market",
    category: "Community",
    publishedAt: "2026-11-24T17:20:00Z",
    relevanceScore: 91,
    aiDecision: "Publish",
    aiProvider: "Gemini",
    aiReasoning:
      "Strong weekend community engagement story with high local shareability.",
    processingStatus: "Drafts Generated",
    location: "Peel",
  },
  {
    id: "IOM-2026-098",
    headline:
      "Offshore wind survey vessel completes autumn seabed mapping off east coast",
    summary:
      "Technical teams have wrapped up preliminary acoustic seabed surveys outside the 12-nautical-mile territorial limit.",
    source: "Energy FM",
    sourceUrl: "https://example.com/energyfm/seabed-survey",
    category: "Energy",
    publishedAt: "2026-11-24T12:05:00Z",
    relevanceScore: 68,
    aiDecision: "Review",
    aiProvider: "Gemini",
    aiReasoning:
      "Moderate general interest; technical update may perform better as a brief story slide rather than a main feed post.",
    processingStatus: "Awaiting Review",
    location: "East Coast",
  },
  {
    id: "IOM-2026-097",
    headline:
      "Routine UK-wide banking app maintenance scheduled for Sunday 02:00–04:00",
    summary:
      "Minor overnight maintenance notice affecting UK high-street banking apps with no Isle of Man-specific branch impact.",
    source: "Isle of Man Today",
    sourceUrl: "https://example.com/iomtoday/banking-maintenance",
    category: "Finance",
    publishedAt: "2026-11-23T19:40:00Z",
    relevanceScore: 34,
    aiDecision: "Skip",
    aiProvider: "Groq",
    aiReasoning:
      "Low Isle of Man specificity; routine overnight UK notice does not meet InsideTheIOM editorial threshold.",
    processingStatus: "Rejected",
    location: "Off-Island",
  },
];

export const DEMO_SOCIAL_POSTS: SocialPost[] = [
  {
    id: "POST-IG-201",
    storyId: "IOM-2026-104",
    storyHeadline:
      "Steam Packet confirms winter timetable adjustments for Douglas–Heysham sailings",
    platform: "instagram",
    headline: "WINTER SAILING TIMES UPDATED",
    caption:
      "Planning a crossing before the end of the year? The Isle of Man Steam Packet Company has confirmed updated winter departure windows on the Douglas–Heysham route.\n\nSwipe through for key departure changes, check-in cutoffs, and where to verify your booking before heading to the Sea Terminal.",
    hashtags: [
      "#IsleOfMan",
      "#InsideTheIOM",
      "#ManxNews",
      "#Douglas",
      "#SteamPacket",
      "#IrishSea",
    ],
    status: "SCHEDULED",
    scheduledFor: "2026-11-26T18:00:00",
    format: "1080×1350 (4:5)",
    updatedAt: "2026-11-26T10:05:00Z",
  },
  {
    id: "POST-TT-201",
    storyId: "IOM-2026-104",
    storyHeadline:
      "Steam Packet confirms winter timetable adjustments for Douglas–Heysham sailings",
    platform: "tiktok",
    headline: "Douglas–Heysham Winter Sailings: What Changed",
    caption:
      "Heading across on the boat this winter? Here is the 20-second breakdown of the updated Douglas–Heysham timetable and what to check before you travel.",
    hashtags: ["#IsleOfMan", "#IOM", "#ManxTikTok", "#InsideTheIOM", "#TravelUpdate"],
    status: "APPROVED",
    scheduledFor: "2026-11-27T12:30:00",
    format: "1080×1920 (9:16)",
    updatedAt: "2026-11-26T10:12:00Z",
  },
  {
    id: "POST-IG-202",
    storyId: "IOM-2026-100",
    storyHeadline:
      "TT 2027 paddock hospitality & grandstand early-bird allocation goes live",
    platform: "instagram",
    headline: "TT 2027 GRANDSTAND ALLOCATION OPEN",
    caption:
      "Early-bird grandstand passes and paddock hospitality packages for TT 2027 are officially live.\n\nWhether you are watching from Noble's Park or booking with a group from off-island, here is what is included in the first release.",
    hashtags: [
      "#IOMTT",
      "#IsleOfManTT",
      "#InsideTheIOM",
      "#Motorsport",
      "#IsleOfMan",
    ],
    status: "SCHEDULED",
    scheduledFor: "2026-11-27T18:30:00",
    format: "1080×1350 (4:5)",
    updatedAt: "2026-11-25T15:30:00Z",
  },
  {
    id: "POST-TT-202",
    storyId: "IOM-2026-100",
    storyHeadline:
      "TT 2027 paddock hospitality & grandstand early-bird allocation goes live",
    platform: "tiktok",
    headline: "TT 2027 Early-Bird Tickets Just Dropped",
    caption:
      "TT 2027 feels far away until the grandstand allocation opens. Here is everything included in wave one.",
    hashtags: ["#IOMTT", "#TT2027", "#IsleOfMan", "#InsideTheIOM"],
    status: "DRAFT",
    format: "1080×1920 (9:16)",
    updatedAt: "2026-11-25T15:45:00Z",
  },
  {
    id: "POST-IG-203",
    storyId: "IOM-2026-099",
    storyHeadline:
      "Peel harbour Christmas markets confirm 45 local artisan & food stalls",
    platform: "instagram",
    headline: "45 LOCAL STALLS AT PEEL HARBOUR",
    caption:
      "Peel breakwater is set for one of the biggest festive weekends on the west coast, with 45 Manx makers, bakers, and independent food stalls confirmed.\n\nSave this post for opening times, parking notes, and local highlights.",
    hashtags: [
      "#Peel",
      "#IsleOfMan",
      "#SupportLocalIOM",
      "#InsideTheIOM",
      "#ManxChristmas",
    ],
    status: "PUBLISHED",
    scheduledFor: "2026-11-25T17:30:00",
    format: "1080×1350 (4:5)",
    updatedAt: "2026-11-25T17:30:00Z",
  },
  {
    id: "POST-IG-204",
    storyId: "IOM-2026-102",
    storyHeadline:
      "Tynwald committee opens public consultation on coastal flood resilience",
    platform: "instagram",
    headline: "HAVE YOUR SAY: COASTAL FLOOD DEFENCES",
    caption:
      "Ramsey, Peel, and Castletown residents can now weigh in on proposed coastal flood resilience works.\n\nPublic consultation runs until January — tap the link in our bio summary for how to submit your views.",
    hashtags: [
      "#IsleOfMan",
      "#Tynwald",
      "#Ramsey",
      "#Peel",
      "#Castletown",
      "#InsideTheIOM",
    ],
    status: "DRAFT",
    format: "1080×1350 (4:5)",
    updatedAt: "2026-11-25T18:10:00Z",
  },
  {
    id: "POST-TT-203",
    storyId: "IOM-2026-099",
    storyHeadline:
      "Peel harbour Christmas markets confirm 45 local artisan & food stalls",
    platform: "tiktok",
    headline: "45 Local Stalls Coming to Peel Harbour",
    caption:
      "West coast festive plans sorted. 45 Manx artisan and food stalls are heading to Peel harbour — save this for the weekend.",
    hashtags: ["#PeelIOM", "#IsleOfMan", "#InsideTheIOM", "#ManxFood"],
    status: "PUBLISHED",
    scheduledFor: "2026-11-25T12:00:00",
    format: "1080×1920 (9:16)",
    updatedAt: "2026-11-25T12:00:00Z",
  },
];

export const DEMO_MEDIA_ASSETS: MediaAsset[] = [
  {
    id: "MED-01",
    fileName: "iom-steam-packet-winter-4x5.png",
    title: "Winter Sailing Times Updated",
    category: "Transport",
    templateType: "breaking",
    platformFormat: "1080×1350 (4:5)",
    storyId: "IOM-2026-104",
    storyHeadline:
      "Steam Packet confirms winter timetable adjustments for Douglas–Heysham sailings",
    createdAt: "2026-11-26T10:02:00Z",
    fileSize: "1.4 MB",
    accentTone: "crimson",
  },
  {
    id: "MED-02",
    fileName: "iom-tt2027-grandstand-4x5.png",
    title: "TT 2027 Grandstand Allocation",
    category: "Motorsport",
    templateType: "editorial",
    platformFormat: "1080×1350 (4:5)",
    storyId: "IOM-2026-100",
    storyHeadline:
      "TT 2027 paddock hospitality & grandstand early-bird allocation goes live",
    createdAt: "2026-11-25T15:25:00Z",
    fileSize: "1.8 MB",
    accentTone: "obsidian",
  },
  {
    id: "MED-03",
    fileName: "peel-harbour-market-4x5.png",
    title: "45 Local Stalls at Peel Harbour",
    category: "Community",
    templateType: "community",
    platformFormat: "1080×1350 (4:5)",
    storyId: "IOM-2026-099",
    storyHeadline:
      "Peel harbour Christmas markets confirm 45 local artisan & food stalls",
    createdAt: "2026-11-25T11:40:00Z",
    fileSize: "1.2 MB",
    accentTone: "bone",
  },
  {
    id: "MED-04",
    fileName: "coastal-consultation-4x5.png",
    title: "Coastal Flood Resilience Consultation",
    category: "Policy & Civic",
    templateType: "editorial",
    platformFormat: "1080×1350 (4:5)",
    storyId: "IOM-2026-102",
    storyHeadline:
      "Tynwald committee opens public consultation on coastal flood resilience",
    createdAt: "2026-11-25T18:05:00Z",
    fileSize: "1.1 MB",
    accentTone: "slate",
  },
  {
    id: "MED-05",
    fileName: "manx-museum-lectures-event-4x5.png",
    title: "Manx Museum Winter Lectures",
    category: "Culture & Events",
    templateType: "event",
    platformFormat: "1080×1350 (4:5)",
    storyId: "IOM-2026-101",
    storyHeadline:
      "Manx National Heritage unveils winter evening lecture series at Manx Museum",
    createdAt: "2026-11-25T14:40:00Z",
    fileSize: "1.5 MB",
    accentTone: "obsidian",
  },
  {
    id: "MED-06",
    fileName: "steam-packet-reel-cover-9x16.png",
    title: "Douglas–Heysham Reel Cover",
    category: "Transport",
    templateType: "breaking",
    platformFormat: "1080×1920 (9:16)",
    storyId: "IOM-2026-104",
    storyHeadline:
      "Steam Packet confirms winter timetable adjustments for Douglas–Heysham sailings",
    createdAt: "2026-11-26T10:10:00Z",
    fileSize: "2.1 MB",
    accentTone: "crimson",
  },
];

export const DEMO_ACTIVITIES: ActivityItem[] = [
  {
    id: "ACT-1",
    action: "Demo draft generated",
    detail: "Instagram & TikTok captions created for Steam Packet winter timetable",
    timestamp: "10:12 AM",
    type: "draft",
  },
  {
    id: "ACT-2",
    action: "AI relevance scored (Gemini)",
    detail: "Douglas Promenade tramway maintenance scored 86/100 → Publish",
    timestamp: "09:40 AM",
    type: "ai",
  },
  {
    id: "ACT-3",
    action: "RSS batch collected (Demo)",
    detail: "8 stories indexed from Manx Radio, IOM Today, 3FM, Gov.im",
    timestamp: "09:15 AM",
    type: "ingest",
  },
  {
    id: "ACT-4",
    action: "Post scheduled (Demo)",
    detail: "TT 2027 Grandstand Allocation queued for Nov 27, 18:30",
    timestamp: "Yesterday",
    type: "schedule",
  },
  {
    id: "ACT-5",
    action: "Story approved",
    detail: "Tynwald coastal flood resilience consultation marked Approved",
    timestamp: "Yesterday",
    type: "approval",
  },
];

export const DEMO_SETTINGS: StudioSettings = {
  newsSources: [
    {
      id: "src-manx-radio",
      name: "Manx Radio",
      feedUrl: "https://www.manxradio.com/news/isle-of-man-news/rss/",
      enabled: true,
      lastPolledDemo: "2026-11-26 09:15 (Demo)",
      itemsCollectedDemo: 42,
    },
    {
      id: "src-iom-today",
      name: "Isle of Man Today",
      feedUrl: "https://www.iomtoday.co.im/rss",
      enabled: true,
      lastPolledDemo: "2026-11-26 09:15 (Demo)",
      itemsCollectedDemo: 35,
    },
    {
      id: "src-3fm",
      name: "3FM Isle of Man",
      feedUrl: "https://www.three.fm/news/rss/",
      enabled: true,
      lastPolledDemo: "2026-11-26 09:15 (Demo)",
      itemsCollectedDemo: 28,
    },
    {
      id: "src-gov-im",
      name: "Isle of Man Government",
      feedUrl: "https://www.gov.im/news/rss",
      enabled: true,
      lastPolledDemo: "2026-11-26 09:15 (Demo)",
      itemsCollectedDemo: 19,
    },
    {
      id: "src-energy-fm",
      name: "Energy FM",
      feedUrl: "https://www.energyfm.net/rss",
      enabled: false,
      lastPolledDemo: "2026-11-24 12:05 (Demo)",
      itemsCollectedDemo: 11,
    },
  ],
  primaryAiProvider: "Gemini",
  fallbackAiProvider: "Groq",
  relevanceThreshold: 75,
  dailyPublishingTarget: 2,
  timezone: "Europe/Isle_of_Man",
  instagramConnected: false,
  tiktokConnected: false,
  automationEnabled: false,
};
