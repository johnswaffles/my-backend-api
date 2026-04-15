import { GENERAL_CHAT_SYSTEM_PROMPT } from './prompts.js';

function extractResponseText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') parts.push(content.text);
      if (typeof content?.output_text === 'string') parts.push(content.output_text);
    }
  }

  return parts.join('\n').trim();
}

function extractJsonObject(text) {
  if (!text || typeof text !== 'string') return null;

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sanitizeSources(rawSources) {
  if (!Array.isArray(rawSources)) return [];

  return rawSources
    .filter((source) => source && typeof source === 'object')
    .map((source) => ({
      title: typeof source.title === 'string' ? source.title.trim() : '',
      url: typeof source.url === 'string' ? source.url.trim() : ''
    }))
    .filter((source) => source.title && source.url)
    .slice(0, 3);
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((turn) => turn && typeof turn === 'object')
    .map((turn) => ({
      role: turn.role === 'assistant' ? 'assistant' : 'user',
      content: typeof turn.content === 'string' ? turn.content.trim() : ''
    }))
    .filter((turn) => turn.content);
}

function buildPageContextText(pageContext) {
  if (!pageContext || typeof pageContext !== 'object') return '';

  const bits = [];
  if (typeof pageContext.brand === 'string' && pageContext.brand.trim()) bits.push(`Brand: ${pageContext.brand.trim()}`);
  if (typeof pageContext.pageTitle === 'string' && pageContext.pageTitle.trim()) bits.push(`Page title: ${pageContext.pageTitle.trim()}`);
  if (typeof pageContext.pageSummary === 'string' && pageContext.pageSummary.trim()) bits.push(`Page summary: ${pageContext.pageSummary.trim()}`);
  return bits.join('\n');
}

export async function askGeneralAssistant({ apiKey, model, message, history = [], pageContext = null }) {
  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  const normalizedHistory = normalizeHistory(history);

  if (!apiKey) {
    return {
      reply: '618FOOD.COM is ready, but the assistant is not configured on the server yet.',
      sources: []
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      tools: [{ type: 'web_search' }],
      reasoning: { effort: 'medium' },
      text: {
        format: {
          type: 'json_schema',
          name: 'general_chat',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['reply', 'sources'],
            properties: {
              reply: { type: 'string' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['title', 'url'],
                  properties: {
                    title: { type: 'string' },
                    url: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      input: [
        {
          role: 'system',
          content: GENERAL_CHAT_SYSTEM_PROMPT
        },
        ...(buildPageContextText(pageContext)
          ? [
              {
                role: 'system',
                content: `Page context:\n${buildPageContextText(pageContext)}`
              }
            ]
          : []),
        ...normalizedHistory.map((turn) => ({
          role: turn.role,
          content: turn.content
        })),
        {
          role: 'user',
          content: cleanMessage
        }
      ],
      max_output_tokens: 700
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const messageText = typeof data?.error?.message === 'string' ? data.error.message : 'OpenAI request failed.';
    const error = new Error(messageText);
    error.details = data;
    throw error;
  }

  const text = extractResponseText(data);
  const parsed = extractJsonObject(text);

  if (!parsed || typeof parsed !== 'object') {
    return {
      reply: text || 'I could not generate a live reply just now.',
      sources: []
    };
  }

  return {
    reply: typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim() : 'Here is a helpful reply.',
    sources: sanitizeSources(parsed.sources)
  };
}

export const askFoodAssistant = askGeneralAssistant;
