/**
 * Demo dataset.
 *
 * Used ONLY when provider credentials are missing (or DEMO_MODE=true).
 * Every record produced from this file is flagged `isDemo: true`, is stored
 * with a `demo` source id and the attribution "Sample record — ProjectScope
 * demo", and the UI renders a permanent banner. It is never presented as
 * live research.
 *
 * The records below are synthetic. They describe approaches that genuinely
 * exist in hackathon spaces (so the comparison features are meaningful) but
 * they are not claims about any real project, person or award.
 *
 * NOTE: this module deliberately does NOT import `server-only` — it contains
 * no secrets and is also used by `prisma/seed.ts`, which runs outside Next.
 */

export interface DemoRecord {
  title: string;
  platform: string;
  sourceUrl: string;
  summary: string;
  problemAddressed: string;
  proposedSolution: string;
  targetUsers: string;
  technologies: string[];
  businessModel: string;
  distribution: string;
  domain: string;
  uncertaintyNotes: string[];
}

export const DEMO_SOURCE_ID = "demo";

export const DEMO_RECORDS: DemoRecord[] = [
  {
    title: "Sample: AI study coach for first-year university students",
    platform: "Devpost",
    sourceUrl: "https://devpost.com/demo/ai-study-coach",
    summary:
      "Sample record. A conversational tutor that turns lecture notes into practice questions and a weekly revision plan.",
    problemAddressed: "First-year students struggle to know what to revise and when.",
    proposedSolution: "Upload notes, get an auto-generated spaced-repetition quiz plan.",
    targetUsers: "First-year university students",
    technologies: ["LLM", "React", "Supabase"],
    businessModel: "Freemium subscription",
    distribution: "Campus ambassadors and student societies",
    domain: "Education",
    uncertaintyNotes: [
      "Sample record — not a real project.",
      "Business model and distribution channel are illustrative only.",
    ],
  },
  {
    title: "Sample: Telehealth triage assistant for rural clinics",
    platform: "Devpost",
    sourceUrl: "https://devpost.com/demo/rural-triage-assistant",
    summary:
      "Sample record. A low-bandwidth triage tool that helps community health workers collect symptoms offline and escalate urgent cases.",
    problemAddressed: "Rural clinics have intermittent connectivity and very few staff.",
    proposedSolution: "Offline-first symptom capture with a rule-based escalation list.",
    targetUsers: "Community health workers in rural areas",
    technologies: ["React Native", "SQLite", "FHIR"],
    businessModel: "Paid by district health authority",
    distribution: "Regional health ministries",
    domain: "Health",
    uncertaintyNotes: [
      "Sample record — not a real project.",
      "No award, ranking or user numbers are claimed.",
    ],
  },
  {
    title: "Sample: Carbon accounting dashboard for small retailers",
    platform: "Unstop",
    sourceUrl: "https://unstop.com/demo/carbon-dashboard",
    summary:
      "Sample record. A dashboard that estimates the carbon footprint of a small shop's supply chain from purchase invoices.",
    problemAddressed: "Small retailers cannot afford enterprise carbon accounting tools.",
    proposedSolution: "Upload CSV invoices, get a scope 3 estimate and reduction suggestions.",
    targetUsers: "Independent retail store owners",
    technologies: ["Next.js", "Postgres", "OCR"],
    businessModel: "Subscription per store",
    distribution: "Chamber of commerce partnerships",
    domain: "Sustainability",
    uncertaintyNotes: ["Sample record — not a real project."],
  },
  {
    title: "Sample: AI mock-interview platform for technical hiring",
    platform: "Unstop",
    sourceUrl: "https://unstop.com/demo/ai-mock-interview",
    summary:
      "Sample record. Generates role-specific interview questions, records the answer and scores it against a rubric.",
    problemAddressed: "Candidates lack realistic interview practice and instant feedback.",
    proposedSolution: "Browser-based mock interview with rubric-based scoring and transcripts.",
    targetUsers: "Job-seeking students and career switchers",
    technologies: ["Next.js", "Whisper", "OpenAI"],
    businessModel: "Freemium with paid report packs",
    distribution: "University career services and bootcamps",
    domain: "Career",
    uncertaintyNotes: ["Sample record — not a real project."],
  },
  {
    title: "Sample: Gamified habit tracker for ADHD users",
    platform: "Hacker News (Algolia)",
    sourceUrl: "https://news.ycombinator.com/item?id=00000000",
    summary:
      "Sample record. A habit tracker that adapts its daily task list and uses short, low-friction interactions instead of streaks.",
    problemAddressed: "Streak-based habit trackers punish users with ADHD.",
    proposedSolution: "Adaptive daily task list with forgiving streaks and body-doubling mode.",
    targetUsers: "Adults with ADHD",
    technologies: ["TypeScript", "SQLite", "Push API"],
    businessModel: "One-time purchase",
    distribution: "ADHD community forums and podcasts",
    domain: "Health",
    uncertaintyNotes: ["Sample record — not a real project."],
  },
  {
    title: "Sample: Community solar sharing platform for apartment blocks",
    platform: "Web",
    sourceUrl: "https://example.com/demo/solar-sharing",
    summary:
      "Sample record. Lets residents of one building share locally generated solar power and settle credits monthly.",
    problemAddressed: "Apartment residents in solar-poor grids cannot buy rooftop solar.",
    proposedSolution: "Block-level energy ledger with automatic credit settlement.",
    targetUsers: "Apartment residents without rooftop access",
    technologies: ["Next.js", "IoT", "Stripe"],
    businessModel: "Small platform fee on settled credits",
    distribution: "Property management companies",
    domain: "Energy",
    uncertaintyNotes: ["Sample record — not a real project."],
  },
  {
    title: "Sample: Sign-language captioning for online lectures",
    platform: "Web",
    sourceUrl: "https://example.com/demo/sign-captioning",
    summary:
      "Sample record. Real-time captioning of a lecturer's speech into a signed-language avatar overlay for deaf students.",
    problemAddressed: "Deaf students relying on live captions lose nuance and lag behind in fast lectures.",
    proposedSolution: "On-device sign avatar rendering, low-latency, captions retained as searchable notes.",
    targetUsers: "Deaf and hard-of-hearing students",
    technologies: ["MediaPipe", "WebGPU", "TypeScript"],
    businessModel: "Free for students, paid university licence",
    distribution: "University disability services",
    domain: "Education",
    uncertaintyNotes: ["Sample record — not a real project."],
  },
  {
    title: "Sample: AI legal aid for tenancy disputes",
    platform: "Web",
    sourceUrl: "https://example.com/demo/tenancy-aid",
    summary:
      "Sample record. Walks a renter through a tenancy dispute, identifies which clauses may be unenforceable and drafts a letter.",
    problemAddressed: "Renters facing disputes cannot afford legal advice and miss deadlines.",
    proposedSolution: "Guided question flow, deadline reminders and letter drafting with citations to local tenancy law.",
    targetUsers: "Renters in housing disputes",
    technologies: ["LLM", "Next.js", "Postgres"],
    businessModel: "Free, with a paid document-review tier",
    distribution: "Tenant unions and advice charities",
    domain: "Legal",
    uncertaintyNotes: [
      "Sample record — not a real project.",
      "No legal-accuracy claim is made.",
    ],
  },
  {
    title: "Sample: Voice-first medication reminder for low-vision elders",
    platform: "Unstop",
    sourceUrl: "https://unstop.com/demo/voice-med-reminder",
    summary:
      "Sample record. A screen-reader-friendly reminder that confirms a dose by voice and detects a missed confirmation.",
    problemAddressed: "Low-vision elders miss medication doses when apps depend on sight.",
    proposedSolution: "Voice confirmation loop with a caregiver escalation path.",
    targetUsers: "Low-vision older adults living independently",
    technologies: ["Python", "Whisper", "AWS IoT"],
    businessModel: "Caregiver subscription",
    distribution: "Home-care agencies",
    domain: "Health",
    uncertaintyNotes: ["Sample record — not a real project."],
  },
  {
    title: "Sample: Open-source agriculture sensor mesh for smallholder farms",
    platform: "Web",
    sourceUrl: "https://example.com/demo/agri-sensor-mesh",
    summary:
      "Sample record. A LoRa mesh of cheap soil sensors that a farmer can install without a technician.",
    problemAddressed: "Smallholders cannot justify commercial precision-agriculture hardware.",
    proposedSolution: "Peer-to-peer sensor mesh with a phone-based dashboard and battery-free nodes.",
    targetUsers: "Smallholder farmers in low-connectivity regions",
    technologies: ["LoRa", "ESP32", "Python"],
    businessModel: "Hardware sold at cost, subscription for analytics",
    distribution: "Agricultural cooperatives and NGOs",
    domain: "Agriculture",
    uncertaintyNotes: ["Sample record — not a real project."],
  },
  {
    title: "Sample: Chatbot triage for a university's mental-health service",
    platform: "Devpost",
    sourceUrl: "https://devpost.com/demo/uni-mental-health-chatbot",
    summary:
      "Sample record. A first-line chatbot that screens students, books a counsellor and escalates crisis language to a human immediately.",
    problemAddressed: "University counselling services are oversubscribed and students wait weeks for an appointment.",
    proposedSolution: "Always-on screening plus a hard escalation path for crisis language.",
    targetUsers: "University students needing mental-health support",
    technologies: ["Python", "LLM", "Cal.com"],
    businessModel: "University licence, per-student pricing",
    distribution: "University wellbeing departments",
    domain: "Health",
    uncertaintyNotes: [
      "Sample record — not a real project.",
      "Clinical safety claims are not made.",
    ],
  },
  {
    title: "Sample: Repair-parts marketplace for e-bikes",
    platform: "Web",
    sourceUrl: "https://example.com/demo/ebike-parts",
    summary:
      "Sample record. A catalogue and fit guide that helps e-bike owners identify the right replacement part and a local repair shop.",
    problemAddressed: "E-bike owners replace whole bikes instead of parts because part numbers are confusing.",
    proposedSolution: "Model-to-part matching from a photo plus a repair-shop directory.",
    targetUsers: "E-bike owners and small repair shops",
    technologies: ["Next.js", "Postgres", "Vision API"],
    businessModel: "Marketplace commission on parts and a lead fee for shops",
    distribution: "E-bike shops and community ride groups",
    domain: "Mobility",
    uncertaintyNotes: ["Sample record — not a real project."],
  },
];

export const DEMO_CLUSTERS = [
  {
    clusterId: "cluster-ai-assist",
    label: "AI assistant on top of an existing workflow",
    approach:
      "Take a workflow that already exists (studying, hiring, therapy intake, tenancy advice) and put a chat interface in front of it.",
    memberIndexes: [0, 3, 7, 10],
    repeatedPatterns: [
      "Conversation is the primary interface",
      "Output is generated content the user then reviews",
      "A paid tier gates the most useful output",
    ],
    sharedTargetUsers: [
      "Students",
      "Job seekers",
      "Service users",
    ],
    sharedBusinessModels: ["Freemium subscription"],
    sharedDistribution: [],
    evidencedLimitations: [
      "The sampled records do not describe how accuracy is verified, so the accuracy of the output is unstated.",
    ],
  },
  {
    clusterId: "cluster-hardware-service",
    label: "Hardware-plus-software service for a physical constraint",
    approach:
      "Address a physical or infrastructure constraint (connectivity, sight, housing, farming) with a device or offline-first app plus a software layer.",
    memberIndexes: [1, 4, 6, 8, 9, 11],
    repeatedPatterns: [
      "Designed for low-connectivity or low-literacy environments",
      "Distribution runs through an institution rather than a consumer app store",
    ],
    sharedTargetUsers: [],
    sharedBusinessModels: [],
    sharedDistribution: [],
    evidencedLimitations: [
      "The sampled records mostly state the constraint but not how the solution was validated with real users.",
    ],
  },
];

/** A clearly-labelled report used in demo mode. */
export const DEMO_REPORT = {
  summary:
    "Demo report. The ten sample records cover two recurring approaches: an AI assistant layered onto an existing workflow, and a hardware-or-offline service built around a physical constraint. The clearest gap in the sampled material is accessibility: only one record targets users with a permanent sensory or mobility constraint, and none of them describe a distribution channel that reaches that audience directly. This is a demonstration of the report format and is not research about any real market.",
  gaps: [
    {
      id: "gap-demo-accessibility",
      title: "Assistive access is treated as a feature, not a segment",
      observation:
        "Across the sampled records, assistive use appears in one project only, and even there the distribution route is institutional rather than community-led.",
      supportingEvidence: [
        "Sample: Sign-language captioning for online lectures — distribution listed as university disability services.",
        "Sample: Voice-first medication reminder for low-vision elders — distribution listed as home-care agencies.",
      ],
      sourceUrls: [
        "https://example.com/demo/sign-captioning",
        "https://unstop.com/demo/voice-med-reminder",
      ],
      confidence: "medium" as const,
      assumptions: [
        "Assumes the sample set is representative of the wider field — it is not, it is a demo set.",
        "Assumes distribution channel reflects reach; a different channel could change the conclusion.",
      ],
      affectedUsers: [
        "Deaf and hard-of-hearing students",
        "Low-vision older adults living independently",
      ],
      proposedImprovement:
        "Design for the assistive use case first and treat the mainstream product as the special case, then pick a distribution channel the affected community already trusts.",
      potentialBusinessValue:
        "Qualitative in the sample set: assistive segments are usually under-served because the incumbent channel does not reach them. No revenue figure is evidenced.",
      validationExperiment:
        "Run one working session with three users from the target group and a community organisation, and measure whether they can complete the core task unaided. No interviews are claimed in this demo.",
      claimType: "hypothesis" as const,
    },
    {
      id: "gap-demo-validation",
      title: "Validation practices are not described",
      observation:
        "None of the sampled records state how they tested their solution with users; all describe what was built.",
      supportingEvidence: [
        "Sample: AI study coach for first-year university students — no testing described.",
        "Sample: Carbon accounting dashboard for small retailers — no testing described.",
        "Sample: Gamified habit tracker for ADHD users — no testing described.",
      ],
      sourceUrls: [
        "https://devpost.com/demo/ai-study-coach",
        "https://unstop.com/demo/carbon-dashboard",
        "https://news.ycombinator.com/item?id=00000000",
      ],
      confidence: "medium" as const,
      assumptions: [
        "Assumes the sample snippets are complete rather than abbreviated.",
      ],
      affectedUsers: ["Hackathon teams judging their own next iteration"],
      proposedImprovement:
        "State the test and its result in the project record itself so the next team can reuse the learning.",
      potentialBusinessValue:
        "Qualitative: teams that record validation findings can differentiate on evidence rather than features.",
      validationExperiment:
        "Compare the number of projects in a sample that publish a validation result against those that do not.",
      claimType: "hypothesis" as const,
    },
  ],
  patterns: [
    {
      pattern: "Conversation as the primary interface",
      occurrences: [
        "Sample: AI study coach for first-year university students",
        "Sample: AI mock-interview platform for technical hiring",
        "Sample: AI legal aid for tenancy disputes",
      ],
      evidenceCount: 3,
    },
    {
      pattern: "Institutional distribution rather than consumer distribution",
      occurrences: [
        "Sample: Telehealth triage assistant for rural clinics",
        "Sample: Sign-language captioning for online lectures",
        "Sample: Open-source agriculture sensor mesh for smallholder farms",
      ],
      evidenceCount: 3,
    },
  ],
  competitors: [
    {
      name: "Sample: AI study coach for first-year university students",
      url: "https://devpost.com/demo/ai-study-coach",
      approach: "Note-to-quiz revision assistant.",
      targetUsers: "First-year university students",
      businessModel: "Freemium subscription",
      distribution: "Campus ambassadors and student societies",
      limitations: ["Does not state how answer quality is checked."],
    },
    {
      name: "Sample: Chatbot triage for a university's mental-health service",
      url: "https://devpost.com/demo/uni-mental-health-chatbot",
      approach: "Always-on screening with a hard escalation path.",
      targetUsers: "University students needing mental-health support",
      businessModel: "University licence",
      distribution: "University wellbeing departments",
      limitations: ["No clinical-safety evidence is stated."],
    },
  ],
  assumptions: [
    {
      assumption: "The demo sample mirrors the shape of real hackathon work.",
      whyItMatters: "Every conclusion in this demo report scales with that assumption.",
      howToValidate: "Replace the demo dataset with a live research run and compare the cluster count.",
    },
    {
      assumption: "Search-result snippets carry enough signal to normalise a project record.",
      whyItMatters: "Records derived from snippets alone will have gaps.",
      howToValidate: "Compare normalised records against the original pages for ten results.",
    },
  ],
  experiments: [
    {
      title: "Assisted-accessibility session",
      hypothesis: "A user in the assistive segment can complete the core task unaided after one session.",
      method: "Three moderated sessions with a community organisation.",
      metric: "Task completion without facilitator help.",
      successCriteria: "At least two of three participants complete the task unaided.",
      duration: "1 week",
      cost: "Low",
      relatedGapId: "gap-demo-accessibility",
    },
    {
      title: "Validation-practice census",
      hypothesis: "Fewer than one in five sample records state a user test.",
      method: "Code ten real project pages from the same sources and count those that state a test.",
      metric: "Share of records stating a user test.",
      successCriteria: "Produce a count with a named source for each record.",
      duration: "2 days",
      cost: "Low",
      relatedGapId: "gap-demo-validation",
    },
  ],
  sources: [
    { title: "Demo record 1", url: "https://devpost.com/demo/ai-study-coach", source: "devpost.com" },
    { title: "Demo record 2", url: "https://unstop.com/demo/carbon-dashboard", source: "unstop.com" },
    { title: "Demo record 3", url: "https://example.com/demo/agri-sensor-mesh", source: "example.com" },
  ],
  coverageNote:
    "Demo mode. 10 sample records from the bundled dataset were analysed. No live source was contacted and no claim here describes a real project or a real market.",
};

/* -------------------------------------------------------------------------- */
/* Free-choice mode (demo)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The demo analysis. It describes the BUNDLED SAMPLE dataset only — it says
 * nothing about any real hackathon or market.
 */
export const DEMO_DISCOVERY_ANALYSIS = {
  summary:
    "Demo analysis of the 12 bundled sample records. Two approaches dominate: an AI assistant layered onto an existing workflow, and a hardware-or-offline service built around a physical constraint. The sample set gives no evidence of validated user testing, and it barely reaches assistive users. Five problems are proposed from that reading, all of them demonstrations of the format rather than findings about a real market.",
  recurringPatterns: [
    {
      pattern: "Conversation is the primary interface",
      occurrences: [
        "Sample: AI study coach for first-year university students",
        "Sample: AI mock-interview platform for technical hiring",
        "Sample: AI legal aid for tenancy disputes",
      ],
      evidenceCount: 3,
    },
    {
      pattern: "Distribution runs through an institution, not an app store",
      occurrences: [
        "Sample: Telehealth triage assistant for rural clinics",
        "Sample: Sign-language captioning for online lectures",
        "Sample: Open-source agriculture sensor mesh for smallholder farms",
        "Sample: Community solar sharing platform for apartment blocks",
      ],
      evidenceCount: 4,
    },
    {
      pattern: "Designed for a physical or infrastructure constraint",
      occurrences: [
        "Sample: Telehealth triage assistant for rural clinics",
        "Sample: Sign-language captioning for online lectures",
        "Sample: Open-source agriculture sensor mesh for smallholder farms",
        "Sample: Voice-first medication reminder for low-vision elders",
        "Sample: Repair-parts marketplace for e-bikes",
      ],
      evidenceCount: 5,
    },
  ],
  weaknesses: [
    {
      weakness: "No record describes how the solution was tested with users",
      occurrences: [
        "Sample: AI study coach for first-year university students",
        "Sample: Carbon accounting dashboard for small retailers",
        "Sample: Gamified habit tracker for ADHD users",
        "Sample: Community solar sharing platform for apartment blocks",
      ],
      evidenceCount: 4,
    },
    {
      weakness: "Accuracy of the AI output is never addressed",
      occurrences: [
        "Sample: AI mock-interview platform for technical hiring",
        "Sample: AI legal aid for tenancy disputes",
        "Sample: Chatbot triage for a university's mental-health service",
      ],
      evidenceCount: 3,
    },
  ],
  underservedUsers: [
    {
      segment: "People with a permanent sensory or mobility constraint",
      why: "Only one sample record targets this group, and even that one reaches users through an institution rather than the community itself.",
      evidenceCount: 1,
    },
    {
      segment: "People who own a broken physical object",
      why: "The sample set contains a repair marketplace but no record that helps someone diagnose the fault first.",
      evidenceCount: 1,
    },
  ],
  opportunities: [
    {
      opportunity: "Make the diagnosis step part of the product, not the support article",
      why: "The repair-parts sample jumps straight to a catalogue; a fault-identification step would remove the main reason a user cannot act.",
      sourceUrls: ["https://example.com/demo/ebike-parts"],
    },
    {
      opportunity: "Make offline behaviour the default rather than a fallback",
      why: "Several samples assume connectivity that the target users may not have.",
      sourceUrls: [
        "https://unstop.com/demo/ai-mock-interview",
        "https://example.com/demo/tenancy-aid",
      ],
    },
  ],
  candidateProblems: [
    {
      id: "problem-demo-1",
      problem: "People who own a broken physical object cannot find out what is wrong with it, so they replace the whole thing.",
      affectedUsers: ["Owners of e-bikes, appliances and small electronics"],
      whyNow: "Repair-economy rules and right-to-repair movements are pushing diagnosis into software.",
      evidenceUrls: ["https://example.com/demo/ebike-parts"],
      feasibilityNote: "A photo-based fault-guides MVP is buildable in a weekend with an existing vision model.",
    },
    {
      id: "problem-demo-2",
      problem: "Assistive technology reaches users through institutions that the users never chose.",
      affectedUsers: ["Deaf and hard-of-hearing students", "Low-vision older adults"],
      whyNow: "Community-led distribution is now normal in other categories of assistive software.",
      evidenceUrls: ["https://example.com/demo/sign-captioning"],
      feasibilityNote: "Community distribution needs trust, not code, so the MVP should test the channel rather than the feature.",
    },
    {
      id: "problem-demo-3",
      problem: "AI tools break the moment the network does, and the target users are exactly the ones with unreliable networks.",
      affectedUsers: ["Community health workers", "Field technicians"],
      whyNow: "Edge inference is finally cheap enough for a hackathon-scale prototype.",
      evidenceUrls: ["https://unstop.com/demo/rural-triage-assistant"],
      feasibilityNote: "Offline-first sync is a well-understood pattern and demos well on a flaky connection.",
    },
    {
      id: "problem-demo-4",
      problem: "People who are being asked for clinical advice by a chatbot cannot tell how much to trust it.",
      affectedUsers: ["Students using campus mental-health chatbots", "Patients using health assistants"],
      whyNow: "Trust dashboards for AI output are becoming an expected feature.",
      evidenceUrls: ["https://devpost.com/demo/uni-mental-health-chatbot"],
      feasibilityNote: "A provenance-and-escalation UI is cheap to build and demos convincingly.",
    },
    {
      id: "problem-demo-5",
      problem: "Small installers and repairers lose the working knowledge of the machines they service.",
      affectedUsers: ["Independent repair technicians", "Small fleet operators"],
      whyNow: "Right-to-repair rules are pushing manufacturers to publish diagnostic data.",
      evidenceUrls: ["https://example.com/demo/ebike-parts"],
      feasibilityNote: "Needs a data source; a scoped version can use public manuals for one device class.",
    },
  ],
  sources: [
    { title: "Sample record 1", url: "https://devpost.com/demo/ai-study-coach", source: "devpost.com" },
    { title: "Sample record 2", url: "https://unstop.com/demo/carbon-dashboard", source: "unstop.com" },
    { title: "Sample record 3", url: "https://example.com/demo/ebike-parts", source: "example.com" },
  ],
  coverageNote:
    "Demo mode. 12 sample records from the bundled dataset were analysed. No live source was contacted and no claim here describes a real project, competition result or market.",
};

/** Five demo concepts, one per domain, with the five-axis scoring. */
export const DEMO_DISCOVERY_CONCEPTS = [
  {
    id: "concept-demo-fault",
    title: "FaultLens: point a phone at a broken device, get a diagnosis and a part number",
    domain: "Consumer repair",
    tagline: "Turns a dead appliance into a two-minute decision instead of a shopping trip.",
    problem:
      "Owners of e-bikes, appliances and small electronics cannot find out what is wrong, so they replace the whole unit.",
    targetUsers: "Owners of e-bikes and small household appliances",
    solution:
      "A guided diagnosis flow that asks targeted questions, shows the exploded view of the part and links to a local repairer.",
    differentiators: [
      "The diagnosis step is the product; the parts catalogue is only the follow-through.",
      "Works on a phone camera with no specialist hardware.",
    ],
    comparisons: [
      {
        existingProjectTitle: "Sample: Repair-parts marketplace for e-bikes",
        existingProjectUrl: "https://example.com/demo/ebike-parts",
        overlap: "Both help an e-bike owner act on a repair.",
        similarity: 0.58,
        differences: [
          "This concept diagnoses first and sells nothing; the sample jumps straight to the catalogue.",
          "This concept has no marketplace component at all.",
        ],
      },
    ],
    risks: [
      "Vision models are unreliable on unusual device states.",
      "Nobody has been asked whether they would use a phone app instead of a repair shop.",
    ],
    validationPlan:
      "Show a paper prototype to 10 owners of a broken device and measure how many reach a correct diagnosis unaided.",
    scores: {
      feasibility: 9,
      originality: 7,
      impact: 7,
      ambition: 6,
      demoPotential: 9,
    },
    scoreRationale: {
      feasibility: "The whole flow is a question tree plus a camera model — buildable in a weekend.",
      originality:
        "The sampled repair project starts at the catalogue, so diagnosing first is a real difference — but the idea space is not empty.",
      impact:
        "It targets a behaviour the sample set shows (replace instead of repair), but the sample set gives no evidence of how large the behaviour is.",
      ambition: "Multi-device fault coverage is a large surface for a hackathon, so this is mid-range.",
      demoPotential: "Very strong: a phone and a broken device is a perfect stage demo.",
    },
    totalScore: 38,
    evidence: [
      {
        note: "The sampled repair project goes straight to a parts catalogue and fit guide.",
        sourceUrl: "https://example.com/demo/ebike-parts",
      },
    ],
    uncertaintyNotes: [
      "How often owners would attempt a repair rather than replace is not evidenced by the sample set.",
      "The model accuracy needed for the demo is unknown until it is tested.",
    ],
  },
  {
    id: "concept-demo-offline",
    title: "GridCheck: an offline-first triage log for health workers with no signal",
    domain: "Health",
    tagline: "Every feature works with the radio off, and escalation is rule-based so it can be audited.",
    problem:
      "Health workers in low-connectivity areas lose triage context every time the network drops.",
    targetUsers: "Community health workers in low-connectivity areas",
    solution:
      "An offline-first triage log with a deterministic escalation list and a deferred sync queue.",
    differentiators: [
      "Offline is the default path rather than a degraded mode.",
      "Escalation is auditable rules, not model output, so a supervisor can check it.",
    ],
    comparisons: [
      {
        existingProjectTitle: "Sample: Telehealth triage assistant for rural clinics",
        existingProjectUrl: "https://unstop.com/demo/rural-triage-assistant",
        overlap: "Both support a community health worker running a triage.",
        similarity: 0.63,
        differences: [
          "This concept treats the offline case as the default; the sample assumes a connection.",
          "Escalation is deterministic instead of model-generated.",
        ],
      },
    ],
    risks: [
      "A deterministic escalation list needs clinical sign-off we do not have.",
      "Sync conflicts between two workers are unsolved.",
    ],
    validationPlan:
      "Run three offline sessions with health workers using a paper-equivalent prototype and compare decisions with a supervisor's review.",
    scores: {
      feasibility: 8,
      originality: 6,
      impact: 9,
      ambition: 7,
      demoPotential: 8,
    },
    scoreRationale: {
      feasibility: "Offline-first storage and a deferred queue are known patterns; the escalation list is the work.",
      originality:
        "The sampled clinic assistant is close, so the difference is real but narrow.",
      impact:
        "The sampled set repeatedly shows infrastructure constraints as the binding problem, which is a point in favour.",
      ambition: "Clinical workflow plus conflict resolution is a lot for a weekend.",
      demoPotential: "Strong: a demo on a deliberately throttled connection is compelling.",
    },
    totalScore: 38,
    evidence: [
      {
        note: "The sampled clinic assistant is the closest match and assumes connectivity.",
        sourceUrl: "https://unstop.com/demo/rural-triage-assistant",
      },
    ],
    uncertaintyNotes: [
      "No clinical accuracy claim can be made without a clinician reviewing the escalation list.",
    ],
  },
  {
    id: "concept-demo-voice",
    title: "CareEcho: voice check-ins that escalate to a human when the answer changes",
    domain: "Accessibility",
    tagline: "A screen-reader-free care channel that a carer can hear and trust.",
    problem:
      "Low-vision and hard-of-hearing people are reached by assistive software only through the institutions that bought it.",
    targetUsers: "Low-vision older adults and their carers",
    solution:
      "A voice-only check-in loop that confirms a daily state and escalates to a named carer when the pattern changes.",
    differentiators: [
      "Distributed through the community channel rather than a care institution.",
      "Escalation is triggered by a change in the user's own baseline, not a threshold.",
    ],
    comparisons: [
      {
        existingProjectTitle: "Sample: Voice-first medication reminder for low-vision elders",
        existingProjectUrl: "https://unstop.com/demo/voice-med-reminder",
        overlap: "Both are voice-first and aimed at low-vision older adults.",
        similarity: 0.71,
        differences: [
          "This concept generalises beyond medication to a daily state.",
          "This concept is distributed through a community channel instead of home-care agencies.",
        ],
      },
    ],
    risks: [
      "Carer consent and data protection need legal review.",
      "Voice quality in noisy homes is a real constraint.",
    ],
    validationPlan:
      "Run a clickable voice prototype with five older adults and one carer, and count completed check-ins.",
    scores: {
      feasibility: 7,
      originality: 5,
      impact: 9,
      ambition: 6,
      demoPotential: 8,
    },
    scoreRationale: {
      feasibility: "Voice pipelines are easy, but the escalation logic and consent flow add work.",
      originality:
        "The sample set already contains a close voice-first project, so this is the least original of the five.",
      impact: "The sampled set shows this group is barely reached at all.",
      ambition: "Moderate — mostly a product and integration build.",
      demoPotential: "Strong: hearing the interaction is the demo.",
    },
    totalScore: 35,
    evidence: [
      {
        note: "The sampled voice-first reminder already covers the medication case for this group.",
        sourceUrl: "https://unstop.com/demo/voice-med-reminder",
      },
    ],
    uncertaintyNotes: [
      "The community-distribution advantage is a hypothesis, not something the sample set evidences.",
    ],
  },
  {
    id: "concept-demo-manual",
    title: "FixNote: turn a technician's photos into a searchable repair manual for the next technician",
    domain: "Skilled work",
    tagline: "The knowledge stays in the workshop instead of leaving with the technician.",
    problem:
      "Independent repair technicians lose the working knowledge of the machines they service when they leave.",
    targetUsers: "Independent repair technicians and small fleet operators",
    solution:
      "A phone tool that turns a photo-and-note repair into a structured, searchable card for the next technician.",
    differentiators: [
      "Captures knowledge transfer between people, not knowledge about a device.",
      "Works with a customer's own consent, so the data stays with the workshop.",
    ],
    comparisons: [
      {
        existingProjectTitle: "Sample: Repair-parts marketplace for e-bikes",
        existingProjectUrl: "https://example.com/demo/ebike-parts",
        overlap: "Both sit in the repair workflow.",
        similarity: 0.41,
        differences: [
          "This concept is about capturing knowledge rather than selling parts.",
          "The user is the technician, not the owner.",
        ],
      },
    ],
    risks: [
      "Technicians will not write notes during a paid job.",
      "Needs an existing corpus to be useful from day one.",
    ],
    validationPlan:
      "Give three technicians a capture prototype for one week and count cards created without prompting.",
    scores: {
      feasibility: 6,
      originality: 8,
      impact: 6,
      ambition: 5,
      demoPotential: 6,
    },
    scoreRationale: {
      feasibility: "The capture flow is easy; making it habitual inside a paid job is not.",
      originality:
        "Nothing in the sampled set captures knowledge between people, so this is the most distinct idea here.",
      impact: "Knowledge loss in skilled work is real, but the sample set gives no evidence of its scale.",
      ambition: "A capture-and-search product, not a hard technical build.",
      demoPotential: "Weakest of the five — it is hard to show a week of habit on a stage.",
    },
    totalScore: 31,
    evidence: [
      {
        note: "The sampled repair project serves owners, not technicians.",
        sourceUrl: "https://example.com/demo/ebike-parts",
      },
    ],
    uncertaintyNotes: [
      "The behaviour change required from technicians is entirely untested.",
    ],
  },
  {
    id: "concept-demo-carbon",
    title: "ScopeLocal: a carbon estimate a small shop can act on, from invoices it already has",
    domain: "Sustainability",
    tagline: "The carbon number is only useful if the next action is obvious.",
    problem:
      "Small retailers cannot act on a carbon number because enterprise reporting tools assume a data pipeline they do not have.",
    targetUsers: "Independent retail store owners",
    solution:
      "An invoice-to-estimate flow that returns one ranked action instead of a report.",
    differentiators: [
      "Returns a single ranked action, not a dashboard.",
      "Uses invoices the shop already receives instead of asking for new data.",
    ],
    comparisons: [
      {
        existingProjectTitle: "Sample: Carbon accounting dashboard for small retailers",
        existingProjectUrl: "https://unstop.com/demo/carbon-dashboard",
        overlap: "Both turn shop invoices into a carbon estimate.",
        similarity: 0.76,
        differences: [
          "This concept returns one action rather than a dashboard, but the input and the estimate are the same.",
        ],
      },
    ],
    risks: [
      "The sampled project already covers this exact flow, so the difference is thin.",
      "A single action may not move the number enough to matter.",
    ],
    validationPlan:
      "Show three shop owners a single ranked action from their own invoices and ask whether they would do it this month.",
    scores: {
      feasibility: 8,
      originality: 2,
      impact: 6,
      ambition: 5,
      demoPotential: 6,
    },
    scoreRationale: {
      feasibility: "Invoice parsing plus a report is a normal build.",
      originality:
        "The sampled dataset contains this project almost exactly, so originality is the lowest of the five.",
      impact: "The problem is real but the sample set gives no evidence of how many shops are affected.",
      ambition: "Low — a reporting product.",
      demoPotential: "Adequate: a before/after number on a real invoice.",
    },
    totalScore: 27,
    evidence: [
      {
        note: "The sampled carbon dashboard already does invoice-to-estimate for small retailers.",
        sourceUrl: "https://unstop.com/demo/carbon-dashboard",
      },
    ],
    uncertaintyNotes: [
      "This concept should not be pitched as novel — the sampled project is effectively the same product.",
    ],
  },
];

export const DEMO_DISCOVERY_RECOMMENDATION = {
  conceptId: "concept-demo-fault",
  whyPromising:
    "Two demo concepts tie for the highest score, and FaultLens wins on the tie-break because it has the clearest stage demo: a phone, a broken device, and a decision inside two minutes. It also attacks the point where the sampled repair project starts too late — the diagnosis — and the sampled set gives no other record that does that.",
  howItDiffers:
    "The sampled repair-parts project is a catalogue and a fit guide, so it assumes the user already knows what is wrong. FaultLens makes finding out the fault the product, with the parts catalogue only as the follow-through. Everything else in the sample set is a chat interface or an institutional rollout, so nothing else competes with it on this axis.",
  supportingEvidence: [
    {
      note: "The sampled repair-parts record goes straight to a parts catalogue and a fit guide.",
      sourceUrl: "https://example.com/demo/ebike-parts",
    },
    {
      note: "Across the sampled set, no record describes a diagnosis step.",
      sourceUrl: "https://example.com/demo/ebike-parts",
    },
  ],
  caveats: [
    "This ranking is produced from 12 synthetic sample records, so it demonstrates the scoring method rather than a real market judgement.",
    "Vision-model accuracy on unusual device states is unknown until it is tested.",
    "The demo dataset says nothing about how many owners would rather repair than replace.",
  ],
};

export const DEMO_DISCOVERY_COMMON_GROUND = [
  "A phone or browser client as the interface",
  "An institution or community as the distribution channel",
  "Freemium or per-seat pricing",
  "A single-purpose workflow rather than a platform",
];

export const DEMO_DISCOVERY_UNVALIDATED = [
  "That users in these segments will adopt a new tool at all.",
  "That the diagnosis accuracy a phone model can reach is good enough.",
  "That the demo's audience — judges, not users — will value the same thing users do.",
];

export const DEMO_PROPOSAL = {
  title: "FaultLens",
  abstract:
    "FaultLens turns a broken device into a two-minute decision. Point a phone at the fault, answer four short questions, and get a ranked diagnosis, the part that is probably responsible, and a local repairer who can fit it. It replaces the guesswork and the unnecessary replacement that sit between a broken device and a working one.",
  problemStatement:
    "Owners of e-bikes, appliances and small electronics cannot find out what is wrong with them. Without a diagnosis, the only two options are to guess at a part or to replace the whole unit — so a repairable device becomes waste and a repairable owner becomes someone who shops for a new one.",
  targetUsers:
    "Owners of e-bikes and small household appliances who want to repair rather than replace, and the independent repairers who end up doing the work anyway.",
  solution:
    "A guided diagnosis flow: the user photographs the fault and answers targeted questions, the app narrows the cause, shows the part in an exploded view with a part number, and links to a nearby repairer. Where a manual is public, the app cites it so the reasoning is checkable rather than magic.",
  coreFeatures: [
    { name: "Guided fault questions", description: "A short branch of questions that narrows the fault from the photo and the answers." },
    { name: "Ranked diagnosis with confidence", description: "Two or three candidate causes with a plain-language reason and how confident the system is." },
    { name: "Exploded view and part number", description: "The suspected part highlighted on a diagram, with the part number a repairer needs." },
    { name: "Source-backed explanations", description: "Links to the public manual or spec sheet the reasoning came from, so the answer is checkable." },
    { name: "Local repairer handoff", description: "A shareable card with the fault, the part number and the diagnosis for a repair shop." },
  ],
  techStack: [
    { technology: "Next.js (web app)", why: "Fast to build, easy to demo on a stage, no app-store friction for the user." },
    { technology: "A vision model for the photo", why: "Handles the free-text photo so the user does not have to know the vocabulary." },
    { technology: "Zod for the diagnosis schema", why: "Keeps the model's output structured and validated before it is shown." },
    { technology: "SQLite or Postgres for the part catalogue", why: "Small, queryable, and enough for the handful of device classes we cover." },
    { technology: "Tailwind CSS", why: "Consistent, readable UI without fighting the layout on a phone." },
  ],
  architecture:
    "A Next.js front end talks to a small route-handler API. The API calls the vision model once to describe the photo, then runs a rule-and-retrieval pass over the part catalogue and the public manual text to produce a ranked diagnosis in the shared Zod schema. The catalogue is a relational table of devices, parts and symptoms, seeded with one device class. Nothing is written back to a third-party system: the app is read-only against public manuals, which keeps the source-compliance story simple.",
  implementationRoadmap: [
    {
      phase: "Phase 1 — a demonstrable diagnosis",
      duration: "6 hours",
      tasks: [
        "Seed the part catalogue for one device class (an e-bike hub motor)",
        "Build the photo upload and the vision description call",
        "Implement the symptom question branch as a decision table",
        "Return one ranked cause with a part number",
      ],
      exitCriteria: "A photo plus four answers produces a part number on screen, in front of a judge.",
    },
    {
      phase: "Phase 2 — trustworthy output",
      duration: "5 hours",
      tasks: [
        "Store the public manual text for the seeded device and cite the passage behind each cause",
        "Show the confidence and the reason for each candidate",
        "Add the exploded view with the part highlighted",
        "Validate every model response against the Zod schema and fail visibly when it does not match",
      ],
      exitCriteria: "Every diagnosis links to the manual passage it came from.",
    },
    {
      phase: "Phase 3 — the handover",
      duration: "4 hours",
      tasks: [
        "Build the repairer handoff card",
        "Add a small set of seed repairer locations",
        "Store the session so the user can come back to it",
      ],
      exitCriteria: "A user can hand a complete diagnosis to a repairer in one tap.",
    },
    {
      phase: "Phase 4 — validation",
      duration: "3 hours",
      tasks: [
        "Test with five people who own a broken device and record whether they reach the right part unaided",
        "Test with two technicians and record whether the part number is usable",
        "Write up what failed, not just what worked",
      ],
      exitCriteria: "A written result from five users and two technicians, including the failures.",
    },
  ],
  validationPlan:
    "Test the prototype with five people who own a broken device and two independent technicians. Measure: (1) how many users reach the correct part unaided, (2) how long it takes, (3) whether the technician can act on the part number without a phone call. Report the failures as well as the successes. If the vision step turns out to be the weak link, fall back to a manual question flow and say so in the pitch — the diagnosis is the product, the camera is only an entry point.",
  presentationOutline: [
    { section: "The problem", content: "A photo of a dead e-bike display, then the search results: 'e-bike motor not working'. Nobody knows which part." },
    { section: "The insight", content: "Every repair marketplace starts after the diagnosis. The diagnosis is the product." },
    { section: "The demo", content: "Photograph the fault, answer four questions, get a ranked cause with the part number and the manual passage behind it." },
    { section: "The evidence", content: "Our own test: five owners, two technicians, what happened, including what we got wrong." },
    { section: "What is different", content: "We found the existing work on this problem and it starts at the catalogue. We start before it." },
    { section: "What is next", content: "More device classes, a technician-side view, and the accuracy work we still owe." },
  ],
  originalityDisclosure:
    "We researched the public work on this problem and found a project that is essentially a parts catalogue with a fit guide (https://example.com/demo/ebike-parts). It assumes the user already knows what is wrong. Our concept differs by making the diagnosis the product and the catalogue the follow-through. We have not run this against a live market, we have not shown it to any user outside our own test, and we do not claim the idea is guaranteed to be novel — the next person to build a diagnosis-first repair tool would be doing the same thing. What is still unvalidated: the accuracy a phone model reaches on unusual faults, and whether owners would rather repair than replace.",
  attribution: [
    "Sample: Repair-parts marketplace for e-bikes — inspiration for the parts catalogue and the repairer directory.",
  ],
  evidence: [
    {
      note: "The sampled repair-parts project assumes the user already knows the fault.",
      sourceUrl: "https://example.com/demo/ebike-parts",
    },
  ],
  uncertaintyNotes: [
    "The scores behind this proposal come from a synthetic demo dataset, not from real market research.",
    "No user testing has been done yet — the validation plan has not been run.",
  ],
};