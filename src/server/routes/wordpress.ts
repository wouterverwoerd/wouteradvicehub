import express, { Request, Response } from 'express';

const router = express.Router();

const DEFAULT_FEED_URL = 'https://woutertest123vw.wordpress.com/feed/';

// Helper to extract text from XML tags handling CDATA and normal text
function getTagValue(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}(?:\\s+[^>]*)?>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  return (match[1] !== undefined ? match[1] : match[2] || '').trim();
}

// Helper to extract multiple tags (e.g. categories)
function getAllTagValues(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}(?:\\s+[^>]*)?>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tagName}>`, 'gi');
  const matches = [...xml.matchAll(regex)];
  return matches.map(m => (m[1] !== undefined ? m[1] : m[2] || '').trim()).filter(Boolean);
}

// Helper to extract image URL from item XML or content
function extractImageUrl(itemXml: string, content: string): string | undefined {
  // 1. Check <media:content url="..." /> or <enclosure url="..." />
  const mediaMatch = itemXml.match(/<(?:media:content|enclosure)[^>]+url=["']([^"']+)["']/i);
  if (mediaMatch && mediaMatch[1]) return mediaMatch[1];

  // 2. Check <img> tags inside content
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) return imgMatch[1];

  return undefined;
}

// Parse RSS XML text into structured JSON feed
function parseRssXml(xmlText: string, feedUrl: string) {
  const channelTitle = getTagValue(xmlText, 'title') || 'woutertest123vw WordPress Site';
  const channelDescription = getTagValue(xmlText, 'description') || 'Latest news & updates from WordPress feed';
  const channelLink = getTagValue(xmlText, 'link') || 'https://woutertest123vw.wordpress.com';

  const itemsXml = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];

  const posts = itemsXml.map((itemXml, index) => {
    const title = getTagValue(itemXml, 'title') || 'Untitled Post';
    const link = getTagValue(itemXml, 'link') || '';
    const pubDate = getTagValue(itemXml, 'pubDate') || new Date().toISOString();
    const creator = getTagValue(itemXml, 'dc:creator') || channelTitle || 'WordPress Author';
    const content = getTagValue(itemXml, 'content:encoded') || getTagValue(itemXml, 'description') || '';
    const rawDescription = getTagValue(itemXml, 'description');
    
    // Clean snippet
    const contentSnippet = rawDescription
      ? rawDescription.replace(/<[^>]+>/g, '').trim().slice(0, 220) + '...'
      : content.replace(/<[^>]+>/g, '').trim().slice(0, 220) + '...';

    const categories = getAllTagValues(itemXml, 'category');
    const imageUrl = extractImageUrl(itemXml, content);
    const guid = getTagValue(itemXml, 'guid') || `post-${index}`;

    return {
      id: guid,
      title,
      link,
      pubDate,
      creator,
      content,
      contentSnippet,
      categories,
      imageUrl,
    };
  });

  return {
    title: channelTitle,
    description: channelDescription,
    link: channelLink,
    feedUrl,
    posts,
  };
}

router.get('/', async (req: Request, res: Response) => {
  const feedUrl = (req.query.url as string) || DEFAULT_FEED_URL;

  try {
    // Attempt 1: Fetch RSS XML feed directly via native node fetch
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Compatible; NodeWordPressFeedReader/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (response.ok) {
      const xmlText = await response.text();
      if (xmlText.includes('<rss') || xmlText.includes('<feed') || xmlText.includes('<channel')) {
        const parsedData = parseRssXml(xmlText, feedUrl);
        return res.json(parsedData);
      }
    }

    // Attempt 2: Fallback to WordPress Public REST API
    // Extract site host if wordpress.com
    const domainMatch = feedUrl.match(/https?:\/\/([^/]+)/i);
    const domain = domainMatch ? domainMatch[1] : 'woutertest123vw.wordpress.com';
    const restEndpoint = `https://public-api.wordpress.com/wp/v2/sites/${domain}/posts?_embed`;

    const restRes = await fetch(restEndpoint);
    if (restRes.ok) {
      const restPosts: any[] = await restRes.json();
      const posts = restPosts.map((p) => {
        const rawContent = p.content?.rendered || '';
        const rawExcerpt = p.excerpt?.rendered || '';
        return {
          id: p.id,
          title: p.title?.rendered ? p.title.rendered.replace(/&#8211;/g, '-').replace(/&amp;/g, '&') : 'Untitled Post',
          link: p.link || '',
          pubDate: p.date || new Date().toISOString(),
          creator: p._embedded?.author?.[0]?.name || 'WordPress Author',
          content: rawContent,
          contentSnippet: rawExcerpt.replace(/<[^>]+>/g, '').trim(),
          categories: [],
          imageUrl: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || extractImageUrl('', rawContent),
        };
      });

      return res.json({
        title: `${domain} Site`,
        description: 'Latest blog posts and announcements',
        link: `https://${domain}`,
        feedUrl,
        posts,
      });
    }

    throw new Error(`HTTP ${response.status}: Failed to load RSS feed from ${feedUrl}`);
  } catch (err: any) {
    console.error('[WordPress Feed Route Error]', err.message || err);

    res.status(500).json({
      message: `Failed to load WordPress feed from ${feedUrl}`,
      error: err.message || String(err),
    });
  }
});

export default router;
