export type Contest = {
  id: string
  title: string
  description: string
  dates: string
  signupDeadline: string
  signupDeadlineLabel: string
  format: string
  eligibility: string
  curator: string
  photoFilename: string
  photoAlt?: string
  photoCredit?: string
  photoSource?: string
  details: string[]
}

export type ContestRegistration = {
  contest_id: string
  contest_title: string
  full_name: string
  group_name: string
  course: string
  contact: string
  is_team: boolean
  team_name?: string
  team_members?: string
  comment?: string
  consent: true
}

export type ContestRecord = {
  id: number
  slug: string
  title: string
  description: string
  dates: string
  signup_deadline: string
  format: string
  eligibility: string
  curator: string
  photo_filename: string | null
  details: string[]
  is_active: boolean
}

export type ContestCreate = Omit<ContestRecord, 'id' | 'slug' | 'is_active'>
