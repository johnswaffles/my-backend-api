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

function extractSourcesFromAnnotations(data) {
  const sources = [];

  for (const item of data?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item?.content || []) {
      for (const annotation of content?.annotations || []) {
        if (annotation?.type !== 'url_citation') continue;
        if (typeof annotation.url !== 'string' || !annotation.url.trim()) continue;
        sources.push({
          title: typeof annotation.title === 'string' && annotation.title.trim() ? annotation.title.trim() : 'Source',
          url: annotation.url.trim()
        });
      }
    }
  }

  return sanitizeSources(sources);
}

function extractSourcesFromText(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split('\n').map((line) => line.trim());
  const sourceLines = [];
  let inSources = false;

  for (const line of lines) {
    if (!line) continue;
    if (/^sources?:\s*$/i.test(line)) {
      inSources = true;
      continue;
    }
    if (!inSources) continue;
    sourceLines.push(line.replace(/^[-*•]\s*/, ''));
  }

  return sourceLines
    .map((line) => {
      const match = line.match(/^(.*?)(?:\s+[—-]\s+|\s+\|\s+)?(https?:\/\/\S+)$/);
      if (match) {
        return {
          title: match[1].trim() || 'Source',
          url: match[2].trim()
        };
      }

      const urlMatch = line.match(/(https?:\/\/\S+)/);
      if (!urlMatch) return null;
      return {
        title: line.replace(urlMatch[1], '').replace(/[—-]\s*$/, '').trim() || 'Source',
        url: urlMatch[1].trim()
      };
    })
    .filter((item) => item && item.title && item.url)
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

function buildConversationText(history, cleanMessage, pageContext) {
  const lines = [];

  const contextText = buildPageContextText(pageContext);
  if (contextText) {
    lines.push(`Context:\n${contextText}`);
  }

  if (history.length) {
    lines.push(
      history
        .map((turn) => `${turn.role === 'assistant' ? 'Assistant' : 'User'}: ${turn.content}`)
        .join('\n')
    );
  }

  lines.push(`User: ${cleanMessage}`);
  return lines.join('\n\n');
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

  try {
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
        instructions: [GENERAL_CHAT_SYSTEM_PROMPT, buildPageContextText(pageContext)].filter(Boolean).join('\n\n'),
        input: buildConversationText(normalizedHistory, cleanMessage, pageContext),
        max_output_tokens: 700
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('OpenAI chat request failed', data);
      return {
        reply: 'I could not reach the live assistant just now. Please try again in a moment.',
        sources: []
      };
    }

    const text = extractResponseText(data);
    const annotationSources = extractSourcesFromAnnotations(data);

    return {
      reply: text || 'I could not generate a live reply just now.',
      sources: annotationSources.length ? annotationSources : sanitizeSources(extractSourcesFromText(text))
    };
  } catch (error) {
    console.error('OpenAI chat request threw', error);
    return {
      reply: 'I could not reach the live assistant just now. Please try again in a moment.',
      sources: []
    };
  }
}

export const askFoodAssistant = askGeneralAssistant;
