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

function stripSourcesSection(text) {
  if (!text || typeof text !== 'string') return '';

  const sourceHeading = text.search(/^\s*sources?:\s*$/gim);
  const sourceBlock = text.search(/^\s*sources?:/gim);
  const cutIndex = sourceHeading >= 0 ? sourceHeading : sourceBlock;
  const body = cutIndex >= 0 ? text.slice(0, cutIndex) : text;

  return body
    .replace(/\s*\[\s*([^\]]+?)\s*\]\(\s*(https?:\/\/[^)]+)\s*\)/g, ' $1')
    .replace(/\s*(https?:\/\/\S+)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
    if (inSources) {
      sourceLines.push(line.replace(/^[-*•]\s*/, ''));
    }
  }

  const allLineCandidates = lines
    .map((line) => line.replace(/^[-*•]\s*/, ''))
    .filter(Boolean);

  const candidates = [...sourceLines, ...allLineCandidates];
  const sources = [];
  const seen = new Set();

  for (const line of candidates) {
    const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    if (markdownMatch) {
      const title = markdownMatch[1].trim();
      const url = markdownMatch[2].trim();
      const key = `${title}::${url}`;
      if (title && url && !seen.has(key)) {
        seen.add(key);
        sources.push({ title, url });
      }
      continue;
    }

    const urlMatches = line.match(/https?:\/\/\S+/g);
    if (!urlMatches) continue;

    for (const rawUrl of urlMatches) {
      const url = rawUrl.trim().replace(/[),.;]+$/, '');
      const titleGuess = line
        .replace(rawUrl, '')
        .replace(/\s+[—-]\s*$/, '')
        .replace(/[()[\]{}<>]+/g, '')
        .trim();
      const title = titleGuess || 'Source';
      const key = `${title}::${url}`;
      if (!url || seen.has(key)) continue;
      seen.add(key);
      sources.push({ title, url });
    }
  }

  return sanitizeSources(sources).slice(0, 3);
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

async function requestAssistantResponse({ apiKey, model, instructions, input, useWebSearch = true }) {
  const tools = useWebSearch ? [{ type: 'web_search' }] : [];
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      tools,
      reasoning: { effort: 'medium' },
      instructions,
      input,
      max_output_tokens: 700
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const messageText = typeof data?.error?.message === 'string' ? data.error.message : 'OpenAI request failed.';
    const error = new Error(messageText);
    error.details = data;
    throw error;
  }

  const text = extractResponseText(data);
  const annotationSources = extractSourcesFromAnnotations(data);
  const cleanedText = stripSourcesSection(text);

  if (!cleanedText || !cleanedText.trim()) {
    const error = new Error('OpenAI returned an empty assistant response.');
    error.details = data;
    throw error;
  }

  return {
    reply: cleanedText.trim(),
    sources: annotationSources.length ? annotationSources : sanitizeSources(extractSourcesFromText(text))
  };
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
    const instructions = [GENERAL_CHAT_SYSTEM_PROMPT, buildPageContextText(pageContext)].filter(Boolean).join('\n\n');
    const input = buildConversationText(normalizedHistory, cleanMessage, pageContext);
    const requestedModel = typeof model === 'string' && model.trim() ? model.trim() : 'gpt-5.4';
    const fallbackModel = /nano/i.test(requestedModel) ? 'gpt-5.4-mini' : 'gpt-5.4';

    try {
      return await requestAssistantResponse({
        apiKey,
        model: requestedModel,
        instructions,
        input,
        useWebSearch: true
      });
    } catch (primaryError) {
      if (fallbackModel !== requestedModel) {
        try {
          return await requestAssistantResponse({
            apiKey,
            model: fallbackModel,
            instructions,
            input,
            useWebSearch: true
          });
        } catch (fallbackError) {
          try {
            return await requestAssistantResponse({
              apiKey,
              model: fallbackModel,
              instructions,
              input,
              useWebSearch: false
            });
          } catch (offlineFallbackError) {
            console.error('OpenAI chat request failed', {
              requestedModel,
              fallbackModel,
              primaryError: String(primaryError?.message || primaryError),
              fallbackError: String(fallbackError?.message || fallbackError),
              offlineFallbackError: String(offlineFallbackError?.message || offlineFallbackError)
            });
          }
        }
      } else {
        try {
          return await requestAssistantResponse({
            apiKey,
            model: requestedModel,
            instructions,
            input,
            useWebSearch: false
          });
        } catch (offlineFallbackError) {
          console.error('OpenAI chat request failed', {
            requestedModel,
            error: String(primaryError?.message || primaryError),
            offlineFallbackError: String(offlineFallbackError?.message || offlineFallbackError)
          });
        }
      }

      return {
        reply: 'I could not reach the live assistant just now. Please try again in a moment.',
        sources: []
      };
    }
  } catch (error) {
    console.error('OpenAI chat request threw', error);
    return {
      reply: 'I could not reach the live assistant just now. Please try again in a moment.',
      sources: []
    };
  }
}

export const askFoodAssistant = askGeneralAssistant;
