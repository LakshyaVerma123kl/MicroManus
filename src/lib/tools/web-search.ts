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
  try {
    // Use DuckDuckGo HTML lite — works without any API key
    const params = new URLSearchParams({ q: query });
    const response = await fetch(`https://html.duckduckgo.com/html/?${params}`, {
      headers: {
        'User-Agent': 'MicroManus Research Agent/1.0',
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
    console.error('DuckDuckGo search error:', error);
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
