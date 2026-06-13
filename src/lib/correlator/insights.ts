export type RangeEntry = {
  label: string
  description: string
  color?: string
}

export type CorrelationInsight = {
  what: string
  howToRead: string
  ranges?: RangeEntry[]
  widgetNote?: string
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const INSIGHTS: Array<{ patterns: string[]; insight: CorrelationInsight }> = [
  {
    patterns: ['trainingload', 'trainingload'],
    insight: {
      what: 'Session RPE × workout duration in minutes. Quantifies the physiological stress of a single session as an index — higher = more demanding.',
      howToRead: 'Track the weekly total, not individual sessions. Spikes >15% above your rolling average signal overreaching risk.',
      ranges: [
        { label: 'Rest day', description: '0 AU' },
        { label: 'Easy / recovery', description: '< 100 AU' },
        { label: 'Moderate session', description: '100 – 300 AU' },
        { label: 'Hard session', description: '300 – 600 AU' },
        { label: 'Recreational week (total)', description: '300 – 1 000 AU' },
        { label: 'Amateur competitive week', description: '1 000 – 2 500 AU' },
        { label: 'Competitive athlete week', description: '2 500 – 5 000+ AU' },
      ],
      widgetNote: 'A Training Load This Week widget has been added to your dashboard to track your weekly total.',
    },
  },
  {
    patterns: ['zone2', 'zone2pct', 'zone2percent'],
    insight: {
      what: 'Time spent in Zone 2 heart rate as a percentage of total workout duration. Zone 2 is low-intensity aerobic work — the foundation of endurance fitness.',
      howToRead: 'Elite endurance athletes spend 70–80% of training in Zone 2. Most people do far too little. Aim to build this number over time.',
      ranges: [
        { label: 'Mostly high-intensity', description: '< 40%' },
        { label: 'Mixed training', description: '40 – 60%' },
        { label: 'Good aerobic base', description: '60 – 80%' },
        { label: 'Elite aerobic focus', description: '> 80%' },
      ],
      widgetNote: 'A Zone 2 % This Week widget has been added to your dashboard.',
    },
  },
  {
    patterns: ['sleepefficiency'],
    insight: {
      what: 'Actual sleep time ÷ time in bed × 100. A core metric used by Oura, Whoop and clinical sleep research.',
      howToRead: 'Low efficiency means you\'re lying in bed awake. If consistently < 85%, look at sleep onset habits and wake-up triggers.',
      ranges: [
        { label: 'Poor', description: '< 75%' },
        { label: 'Fair', description: '75 – 84%' },
        { label: 'Good', description: '85 – 92%' },
        { label: 'Excellent', description: '93 – 100%' },
      ],
      widgetNote: 'A Sleep Efficiency This Week widget has been added to your dashboard.',
    },
  },
  {
    patterns: ['netcaloricbalance', 'caloricbalance', 'netcalori', 'caloriebalance', 'caloribalance'],
    insight: {
      what: 'Calories consumed minus calories burned. A negative number means a calorie deficit (weight loss direction); positive means a surplus (gaining direction).',
      howToRead: 'Single-day swings are normal. Track the weekly average. ±200 kcal/day is maintenance range.',
      ranges: [
        { label: 'Aggressive deficit', description: '−1 000+ kcal/day' },
        { label: 'Moderate deficit (fat loss)', description: '−250 to −500 kcal/day' },
        { label: 'Maintenance', description: '±200 kcal/day' },
        { label: 'Moderate surplus (muscle gain)', description: '+250 to +500 kcal/day' },
        { label: 'Aggressive surplus', description: '+500+ kcal/day' },
      ],
      widgetNote: 'A Calorie Balance This Week widget has been added to your dashboard.',
    },
  },
  {
    patterns: ['proteinperkg', 'proteinkg'],
    insight: {
      what: 'Daily protein intake (g) divided by bodyweight (kg). The standard metric for assessing protein adequacy relative to body size.',
      howToRead: 'Uses your most recent bodyweight log, so it updates automatically even if you only weigh in weekly.',
      ranges: [
        { label: 'Sedentary minimum (RDA)', description: '0.8 g/kg' },
        { label: 'Active / general health', description: '1.2 – 1.6 g/kg' },
        { label: 'Strength training / muscle gain', description: '1.6 – 2.2 g/kg' },
        { label: 'Elite / body recomposition', description: '2.2 – 3.0+ g/kg' },
      ],
    },
  },
  {
    patterns: ['macrosplit', 'protein%ofcalories', 'proteinofcalories', 'carbsofcalories', 'fatofcalories'],
    insight: {
      what: 'Each macro as a percentage of total daily calories. Protein = 4 kcal/g, Carbs = 4 kcal/g, Fat = 9 kcal/g.',
      howToRead: 'There\'s no universal ideal split — it depends on your goal. Use these as a consistency check rather than a daily target.',
      ranges: [
        { label: 'Sedentary (general diet)', description: '10 – 15%' },
        { label: 'Active / fitness goal', description: '20 – 30%' },
        { label: 'High-protein (body recomp)', description: '30 – 40%' },
      ],
    },
  },
]

export function getCorrelationInsight(name: string): CorrelationInsight | null {
  const normName = normalize(name)
  for (const entry of INSIGHTS) {
    if (entry.patterns.some(p => normName.includes(p) || p.includes(normName))) {
      return entry.insight
    }
  }
  return null
}
