import { createServiceClient } from '@/lib/supabase/service'

export type ContentScheduleItem = {
  id: string
  date: string
  platform: 'Instagram' | 'TikTok' | 'Substack'
  pillar: 'YAHA Science' | 'Longevity' | 'Sponsor Challenge'
  title: string
  hook: string | null
  script_details: string | null
  assets_needed: string | null
  status: 'Scheduled' | 'Assets Requested' | 'Assets Received' | 'Edited' | 'Published'
  created_at: string
}

export async function getContentSchedule(): Promise<ContentScheduleItem[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('coaching_content_schedule')
    .select('*')
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching content schedule:', error)
    throw error
  }

  return (data || []) as ContentScheduleItem[]
}
