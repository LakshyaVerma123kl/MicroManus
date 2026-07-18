import { SearchResult } from '@/types';

/**
 * Web search with automatic fallback chain:
 * 1. Brave Search API (if BRAVE_SEARCH_API_KEY is set)
 * 2. DuckDuckGo HTML scrape (browser-like headers)
 * 3. DuckDuckGo Instant Answer API
 * 4. Wikipedia API (always works, never rate-limits)
 */
export async function braveSearch(query: string, count: number = 5): Promise<SearchResult[]> {
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;

  if (braveKey && braveKey !== 'your-brave-key') {
    return searchWithBrave(query, count, braveKey);
  }

  // Free fallback chain
  return searchFreeChain(query, count);
}

async function searchFreeChain(query: string, count: number): Promise<SearchResult[]> {
  // 1. Try DuckDuckGo HTML
  try {
    const ddgResults = await searchWithDuckDuckGoHTML(query, count);
    if (ddgResults.length > 0) return ddgResults;
  } catch (e) {
    console.error('DDG HTML failed:', e);
  }

  // 2. Try DuckDuckGo Instant Answer
  try {
    const instantResults = await searchWithDDGInstant(query);
    if (instantResults.length > 0 && instantResults[0].url) return instantResults;
  } catch (e) {
    console.error('DDG Instant failed:', e);
  }

  // 3. Wikipedia API (guaranteed to work — free, no rate-limits from cloud)
  try {
    const wikiResults = await searchWithWikipedia(query, count);
    if (wikiResults.length > 0) return wikiResults;
  } catch (e) {
    console.error('Wikipedia failed:', e);
  }

  return [{
    title: 'Search temporarily unavailable',
    url: '',
    snippet: `Could not search for "${query}". The agent will answer from its training data instead.`,
  }];
}

// --- Brave Search (paid, best quality) ---
async function searchWithBrave(query: string, count: number, apiKey: string): Promise<SearchResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      count: count.toString(),
      text_decorations: 'false',
    });

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`Brave Search API error: ${response.status}`);
      return searchFreeChain(query, count);
    }

    const data = await response.json();

    const results: SearchResult[] = (data.web?.results || []).map(
      (r: { title?: string; url?: string; description?: string }) => ({
        title: r.title || 'Untitled',
        url: r.url || '',
        snippet: r.description || '',
      })
    );

    return results.length > 0 ? results : searchFreeChain(query, count);
  } catch (error) {
    console.error('Brave Search error:', error);
    return searchFreeChain(query, count);
  }
}

// --- DuckDuckGo HTML scrape ---
async function searchWithDuckDuckGoHTML(query: string, count: number): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`https://html.duckduckgo.com/html/?${params}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity',
      'Referer': 'https://duckduckgo.com/',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`DDG HTML error: ${response.status}`);
  }

  const html = await response.text();
  return parseDDGResults(html, count);
}

function parseDDGResults(html: string, count: number): SearchResult[] {
  const results: SearchResult[] = [];

  const resultPattern = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetPattern = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  const titles: { url: string; title: string }[] = [];
  const snippets: string[] = [];

  let match;
  while ((match = resultPattern.exec(html)) !== null && titles.length < count) {
    let url = match[1];
    const title = match[2].replace(/<[^>]*>/g, '').trim();

    if (url.includes('uddg=')) {
      const decoded = decodeURIComponent(url.split('uddg=')[1]?.split('&')[0] || url);
      url = decoded;
    }

    if (title && url) {
      titles.push({ url, title });
    }
  }

  while ((match = snippetPattern.exec(html)) !== null && snippets.length < count) {
    const snippet = match[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
    snippets.push(snippet);
  }

  for (let i = 0; i < titles.length; i++) {
    results.push({
      title: titles[i].title,
      url: titles[i].url,
      snippet: snippets[i] || '',
    });
  }

  return results;
}

// --- DuckDuckGo Instant Answer API ---
async function searchWithDDGInstant(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, format: 'json', no_html: '1' });
  const response = await fetch(`https://api.duckduckgo.com/?${params}`, {
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json();

  const results: SearchResult[] = [];

  if (data.Abstract) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL || '',
      snippet: data.Abstract,
    });
  }

  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, 4)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.slice(0, 80),
          url: topic.FirstURL,
          snippet: topic.Text,
        });
      }
    }
  }

  return results;
}

// --- Wikipedia API (guaranteed free, never rate-limits from cloud) ---
async function searchWithWikipedia(query: string, count: number): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    format: 'json',
    srlimit: count.toString(),
    srprop: 'snippet|titlesnippet',
    origin: '*',
  });

  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'MicroManus Research Agent/1.0 (research tool)' },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Wikipedia API error: ${response.status}`);
  }

  const data = await response.json();
  const searchResults = data.query?.search || [];

  return searchResults.map((r: { title: string; snippet: string; pageid: number }) => ({
    title: r.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
    snippet: r.snippet.replace(/<[^>]*>/g, '').trim(),
  }));
}
