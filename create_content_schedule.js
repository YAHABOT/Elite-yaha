const { Client } = require('pg');

async function main() {
  const connectionString = 'postgresql://postgres.jwiqwxacxgzpsshtsmsl:YahaLink123!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres';
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Postgres.');

    // 1. Create table coaching_content_schedule
    await client.query(`
      CREATE TABLE IF NOT EXISTS coaching_content_schedule (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          date DATE NOT NULL,
          platform TEXT NOT NULL,              -- 'Instagram' | 'TikTok' | 'Substack'
          pillar TEXT NOT NULL,                -- 'YAHA Science' | 'Longevity' | 'Sponsor Challenge'
          title TEXT NOT NULL,
          hook TEXT,                           -- The first 3-second hook
          script_details TEXT,                 -- Full video script or newsletter draft
          assets_needed TEXT,                  -- Footage, photos, or voiceovers required from you
          status TEXT DEFAULT 'Scheduled',     -- 'Scheduled' | 'Assets Requested' | 'Assets Received' | 'Edited' | 'Published'
          created_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT uq_content_date_platform UNIQUE (date, platform)
      );
    `);
    console.log('Table coaching_content_schedule created successfully.');

    // 2. Clear existing entries to prevent key conflicts if rerun
    await client.query('DELETE FROM coaching_content_schedule WHERE date >= \'2026-07-01\' AND date <= \'2026-07-07\'');
    console.log('Cleared existing schedule rows for July 1-7.');

    // 3. Define content schedule rows
    const rows = [
      {
        date: '2026-07-01',
        platform: 'TikTok',
        pillar: 'Sponsor Challenge',
        title: 'The Mixed Doubles Sub-60 Sponsorship Challenge',
        hook: 'Day 1 of posting until a brand sponsors our first-ever Hyrox Mixed Doubles sub-60 run.',
        script_details: 'Most hybrid athletes have lifetime training resumes. We don\'t. Armaan yo-yo dieted for a decade starting at 130kg. Violetta has 15 years of mechanical load that gave her L3-L4 arthritis. We are trying to hit a world-class sub-60 Hyrox Valencia time on our first try. We built our own AI engine, YAHA, to auto-regulate our recovery so we don\'t destroy our bodies. Follow the daily grind to watch us get sponsored and crush this.',
        assets_needed: '1. Photo of Armaan at 130kg (before). 2. Video clip of Violetta running on track. 3. Video clip of Armaan pushing overloaded sled. 4. Voiceover recording from Armaan.',
        status: 'Scheduled'
      },
      {
        date: '2026-07-02',
        platform: 'TikTok',
        pillar: 'YAHA Science',
        title: 'Evolving Beyond Traditional Fitness Tracking',
        hook: 'Day 2 of posting until a brand sponsors our Hyrox sub-60 run. This is how we log workouts in 10 seconds.',
        script_details: 'Logging workouts in traditional apps is a chore that leads to giving up. We built YAHA so we can type naturally or just upload a photo of our training board, and the AI handles the database entries. Let\'s show you live.',
        assets_needed: '1. Screen recording typing a workout summary into YAHA. 2. Screen recording of the parsed data in the dashboard. 3. Voiceover from Armaan.',
        status: 'Scheduled'
      },
      {
        date: '2026-07-02',
        platform: 'Instagram',
        pillar: 'Longevity',
        title: 'Two Different Starting Lines, One Goal',
        hook: 'Two starting lines. One elite goal.',
        script_details: 'One of us has spent 15 years in competitive sports, battling mechanical wear-and-tear (L3-L4 arthritis) and the old school coaching trap of \'exhaustion over longevity.\' The other was 130kg, trapped in a decade of yo-yo dieting because we were told fitness had to be a constant struggle. We teamed up to change that. We built YAHA to automate our recovery, macro timing, and training loads. Now, we are using this exact system to prepare for a sub-60 minute Hyrox Valencia Mixed Doubles run. Follow along to see the data, the code, and how we train for performance longevity.',
        assets_needed: '1. High-aesthetic video montage of Armaan and Violetta training together. 2. Voiceover or video of them speaking directly to the camera in the box.',
        status: 'Scheduled'
      },
      {
        date: '2026-07-03',
        platform: 'TikTok',
        pillar: 'Sponsor Challenge',
        title: 'The Watch Audit: Calling out Amazfit',
        hook: 'Day 3 of posting until a brand sponsors our Hyrox sub-60 run. Why we are calling out Amazfit.',
        script_details: 'To hit sub-60, our running metrics must be surgically precise. We used to train with an Apple Watch, but it couldn\'t even track distance accurately. When Amazfit became an official Hyrox partner, we got the Active 3 Premium on release day. Now we have daily, precise database logs for every single run since. Hey @Amazfit, you want to sponsor the team that has the most accurate long-term data logs on your tech? Let\'s see who steps up.',
        assets_needed: '1. Close-up video of the Amazfit Active 3 Premium on wrist. 2. Screen recording of running logs in the database. 3. Voiceover from Armaan.',
        status: 'Scheduled'
      },
      {
        date: '2026-07-04',
        platform: 'TikTok',
        pillar: 'Longevity',
        title: 'Banning Leg Extensions for Spinal Arthritis',
        hook: 'Day 4 of posting until a brand sponsors our Hyrox sub-60 run. Why standard gym machines are banned from our prep.',
        script_details: '15 years of mechanical loading gave Violetta L3-L4 spinal arthritis. Overtraining and bad coaching meant constant injury. Today at 35, she\'s stronger than ever because we banned standard gym machines like leg extensions that shear the spine. Instead, we use functional loading patterns like hip thrusts and sandbag lunges designed for performance longevity. Train to build up, not to destroy.',
        assets_needed: '1. Video of Violetta doing heavy sandbag lunges or hip thrusts. 2. Voiceover from Violetta explaining her recovery-focused training philosophy.',
        status: 'Scheduled'
      },
      {
        date: '2026-07-05',
        platform: 'Substack',
        pillar: 'YAHA Science',
        title: 'Defining the Future of Fitness: Evolving Our Systems',
        hook: 'N/A - Email Newsletter',
        script_details: 'Unpack the target splits (4:00/km running, 27-min stations, 2-min transitions). Explain \'System Evolution\'—how we design the database to automatically /pivot schedules when recovery deficits occur instead of grinding into exhaustion. Show how Next.js features and dashboard observations help us track and manage these adjustments.',
        assets_needed: '1. Written post content (no raw media required, text-only).',
        status: 'Scheduled'
      },
      {
        date: '2026-07-05',
        platform: 'Instagram',
        pillar: 'Sponsor Challenge',
        title: 'Running is Our Weakest Station: Pacing Tactics',
        hook: 'Running is where the race is won.',
        script_details: 'In Hyrox Mixed Doubles, you only work one at a time on stations, but you run together. Pacing is everything. Violetta acts as the pacing lead, capping Armaan\'s early cadence (targeting 150-160 spm) to prevent redlining. Showcasing how running is our primary focus and weakest station, paced by a 1h56m half-marathoner.',
        assets_needed: '1. Video clip of Violetta leading a run, Armaan locked onto her shoulder. 2. Voiceover from Violetta describing pacing mechanics.',
        status: 'Scheduled'
      },
      {
        date: '2026-07-05',
        platform: 'TikTok',
        pillar: 'Sponsor Challenge',
        title: 'Running is Now Our Weakest Station',
        hook: 'Day 5 of posting until a brand sponsors our Hyrox sub-60 run. Sleds aren\'t our weakest station. Running is.',
        script_details: 'Everyone worries about the heavy sled push, but we conquered that. Our real battle is the 8km of running. With Violetta leading the pace and Armaan matching her cadence, we audit our data daily to bridge the gap. That is what our AI system tracks.',
        assets_needed: '1. Video of Armaan running on the track, checking his watch. 2. Voiceover from Armaan.',
        status: 'Scheduled'
      },
      {
        date: '2026-07-06',
        platform: 'TikTok',
        pillar: 'YAHA Science',
        title: 'Fueling the Hybrid Engine: Grocery Haul',
        hook: 'Day 6 of posting until a brand sponsors our Hyrox sub-60 run. What we eat to fuel 5 hours of hybrid training.',
        script_details: 'We track everything. Laying out grocery items (creatine, magnesium, protein sources, rice, etc.). Detail the macro targets (3,000 kcal vs. 1,850 kcal). Pre/post-workout carb fueling timing is audited to prevent redlining.',
        assets_needed: '1. Video clips of grocery haul items on the kitchen counter. 2. Voiceover from Armaan.',
        status: 'Scheduled'
      },
      {
        date: '2026-07-07',
        platform: 'TikTok',
        pillar: 'YAHA Science',
        title: 'Inside the 7:00 AM Morning Briefing',
        hook: 'Day 7 of posting until a brand sponsors our Hyrox sub-60 run. This is what our coach sends us every morning at 7:00 AM.',
        script_details: 'Every morning at 7:00 AM, the YAHA system automatically runs a readiness check, pulling sleep, heart rate, and macro compliance, calculating CNS fatigue and Autonomic Balance Index (ABI). If our recovery is low, it pivots our schedule.',
        assets_needed: '1. Screen recording scrolling through the morning briefing on your phone. 2. Voiceover from Armaan.',
        status: 'Scheduled'
      },
      {
        date: '2026-07-07',
        platform: 'Instagram',
        pillar: 'YAHA Science',
        title: 'Why We Train 20kg Overloaded Sleds (The Turf Tax)',
        hook: 'The Turf Tax is real.',
        script_details: 'Friction on competition turf makes sled stations feel roughly 20kg heavier than standard gym turf. We use the YAHA database to log S&C power outputs, adjusting our training loads to train overloaded (Sled Push @ 172kg vs 152kg, Sled Pull @ 123kg vs 103kg) so race day feels light.',
        assets_needed: '1. High-quality photo of the sled loaded with plates. 2. Carousel graphics of sled physics.',
        status: 'Scheduled'
      }
    ];

    // 4. Insert rows
    for (const r of rows) {
      await client.query(`
        INSERT INTO coaching_content_schedule (date, platform, pillar, title, hook, script_details, assets_needed, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [r.date, r.platform, r.pillar, r.title, r.hook, r.script_details, r.assets_needed, r.status]);
    }
    
    console.log(`Inserted ${rows.length} content schedule rows successfully.`);
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await client.end();
  }
}

main();
