import { SearchResult } from '@/types';

/**
 * Web search with automatic fallback:
 * - If BRAVE_SEARCH_API_KEY is set → uses Brave Search API
 * - Otherwise → uses DuckDuckGo (free, no API key needed)
 */
export async function braveSearch(query: string, count: number = 5): Promise<SearchResult[]> {
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;

  if (braveKey && braveKey !== 'your-brave-key') {
    return searchWithBrave(query, count, braveKey);
  }

  // Fallback: DuckDuckGo (free, no API key)
  return searchWithDuckDuckGo(query, count);
}

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
      return searchWithDuckDuckGo(query, count);
    }

    const data = await response.json();

    const results: SearchResult[] = (data.web?.results || []).map(
      (r: { title?: string; url?: string; description?: string }) => ({
        title: r.title || 'Untitled',
        url: r.url || '',
        snippet: r.description || '',
      })
    );

    return results.length > 0 ? results : [{
      title: 'No Results',
      url: '',
      snippet: `No search results found for "${query}".`,
    }];
  } catch (error) {
    console.error('Brave Search error:', error);
    return searchWithDuckDuckGo(query, count);
  }
}

async function searchWithDuckDuckGo(query: string, count: number): Promise<SearchResult[]> {
  // Try DuckDuckGo HTML lite with browser-like headers
  try {
    const params = new URLSearchParams({ q: query });
    const response = await fetch(`https://html.duckduckgo.com/html/?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Referer': 'https://duckduckgo.com/',
      },
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo error: ${response.status}`);
    }

    const html = await response.text();
    const results = parseDDGResults(html, count);

    if (results.length > 0) {
      return results;
    }

    // Fallback to DuckDuckGo instant answer API
    return searchWithDDGInstant(query);
  } catch (error) {
    console.error('DuckDuckGo HTML search error:', error);
    
    // Second fallback: try the instant answer API
    try {
      const instantResults = await searchWithDDGInstant(query);
      if (instantResults.length > 0 && instantResults[0].title !== 'Limited results') {
        return instantResults;
      }
    } catch (e) {
      console.error('DDG instant fallback also failed:', e);
    }

    // Third fallback: use Google web search via scraping
    try {
      return await searchWithGoogleScrape(query, count);
    } catch (e) {
      console.error('Google scrape fallback also failed:', e);
    }

    return [{
      title: 'Search temporarily unavailable',
      url: '',
      snippet: `Could not search for "${query}". The agent will answer from its training data instead.`,
    }];
  }
}

function parseDDGResults(html: string, count: number): SearchResult[] {
  const results: SearchResult[] = [];

  // Extract result blocks from DuckDuckGo lite HTML
  // Results are in <a class="result__a" href="...">title</a>
  // Snippets are in <a class="result__snippet" ...>text</a>
  const resultPattern = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetPattern = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  const titles: { url: string; title: string }[] = [];
  const snippets: string[] = [];

  let match;
  while ((match = resultPattern.exec(html)) !== null && titles.length < count) {
    let url = match[1];
    const title = match[2].replace(/<[^>]*>/g, '').trim();

    // DuckDuckGo wraps URLs in a redirect — extract the real URL
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

async function searchWithDDGInstant(query: string): Promise<SearchResult[]> {
  try {
    const params = new URLSearchParams({ q: query, format: 'json', no_html: '1' });
    const response = await fetch(`https://api.duckduckgo.com/?${params}`);
    const data = await response.json();

    const results: SearchResult[] = [];

    // Abstract (main answer)
    if (data.Abstract) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        snippet: data.Abstract,
      });
    }

    // Related topics
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

    return results.length > 0 ? results : [{
      title: 'Limited results',
      url: '',
      snippet: `Basic search for "${query}" returned limited data. Try rephrasing your query.`,
    }];
  } catch {
    return [{
      title: 'Search unavailable',
      url: '',
      snippet: 'Search service is temporarily unavailable.',
    }];
  }
}

async function searchWithGoogleScrape(query: string, count: number): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, num: count.toString() });
  const response = await fetch(`https://www.google.com/search?${params}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Google scrape error: ${response.status}`);
  }

  const html = await response.text();
  const results: SearchResult[] = [];

  // Parse Google search results - extract titles and URLs from <a> tags within result divs
  // Google results have <h3> tags for titles inside <a> links
  const linkPattern = /<a[^>]*href="\/url\?q=([^"&]+)[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  let match;
  while ((match = linkPattern.exec(html)) !== null && results.length < count) {
    const url = decodeURIComponent(match[1]);
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    if (title && url && url.startsWith('http')) {
      results.push({ title, url, snippet: '' });
    }
  }

  // If the pattern above didn't work, try a simpler approach
  if (results.length === 0) {
    const simplePattern = /<h3[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/h3>/gi;
    while ((match = simplePattern.exec(html)) !== null && results.length < count) {
      const title = match[1].replace(/<[^>]*>/g, '').trim();
      if (title) {
        results.push({ title, url: '', snippet: `Search result for "${query}"` });
      }
    }
  }

  if (results.length === 0) {
    throw new Error('No results parsed from Google');
  }

  return results;
}
