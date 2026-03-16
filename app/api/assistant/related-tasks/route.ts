import { NextRequest, NextResponse } from 'next/server'
import { SmartAutocomplete } from '@/lib/ai/smart-autocomplete'

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskDescription } = body

    if (!taskDescription) {
      return NextResponse.json(
        { error: 'Task description is required' },
        { status: 400 }
      )
    }

    const autocomplete = new SmartAutocomplete()
    const relatedTasks = await autocomplete.findRelatedTasks(
      WORKSPACE_ID,
      USER_ID,
      taskDescription
    )

    return NextResponse.json({ relatedTasks })
  } catch (error) {
    console.error('Related tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to find related tasks' },
      { status: 500 }
    )
  }
}
