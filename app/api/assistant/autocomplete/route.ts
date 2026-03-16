import { NextRequest, NextResponse } from 'next/server'
import { SmartAutocomplete } from '@/lib/ai/smart-autocomplete'

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { partialText, context } = body

    if (!partialText || partialText.length < 3) {
      return NextResponse.json(
        { error: 'Text must be at least 3 characters' },
        { status: 400 }
      )
    }

    const autocomplete = new SmartAutocomplete()
    const result = await autocomplete.completeTaskDescription(
      WORKSPACE_ID,
      USER_ID,
      partialText,
      context
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Autocomplete error:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}
