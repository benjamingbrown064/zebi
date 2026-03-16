import Anthropic from '@anthropic-ai/sdk';

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
  }
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function generateCompletion(
  messages: AIMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: options?.model || 'claude-sonnet-4-20250514',
    max_tokens: options?.maxTokens || 4096,
    temperature: options?.temperature || 1,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  
  throw new Error('Unexpected response format from Claude');
}

export async function generateJSONCompletion<T = any>(
  messages: AIMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<T> {
  const response = await generateCompletion(messages, options);
  
  // Extract JSON from markdown code blocks if present
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch ? jsonMatch[1] : response;
  
  try {
    return JSON.parse(jsonString.trim());
  } catch (err) {
    console.error('Failed to parse JSON response:', response);
    throw new Error('AI returned invalid JSON: ' + (err instanceof Error ? err.message : String(err)));
  }
}
