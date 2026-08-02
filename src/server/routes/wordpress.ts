import express, { Request, Response } from 'express';
import Parser from 'rss-parser';

const router = express.Router();
const parser = new Parser({
  customFields: {
    item: [
      ['dc:creator', 'creator'],
      ['content:encoded', 'contentEncoded'],
      ['category', 'categories', { keepArray: true }],
    ],
  },
});

const DEFAULT_FEED_URL = 'https://woutertest123vw.wordpress.com/feed/';

router.get('/', async (req: Request, res: Response) => {
  const feedUrl = (req.query.url as string) || DEFAULT_FEED_URL;

  try {
    // Try fetching via RSS feed parser
    const feed = await parser.parseURL(feedUrl);

    const posts = (feed.items || []).map((item, index) => {
      // Extract image URL if present in content or enclosures
      let imageUrl = '';
      if (item.enclosure && item.enclosure.url) {
        imageUrl = item.enclosure.url;
      } else {
        const imgMatch = (item.contentEncoded || item.content || '').match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) {
          imageUrl = imgMatch[1];
        }
      }

      // Format categories
      let categories: string[] = [];
      if (Array.isArray(item.categories)) {
        categories = item.categories.map((c: any) => (typeof c === 'string' ? c : c._ || c.$text || ''));
      }

      return {
        id: item.guid || (item as any).id || `post-${index}`,
        title: item.title || 'Untitled Post',
        link: item.link || '',
        pubDate: item.pubDate || new Date().toISOString(),
        creator: item.creator || item['dc:creator'] || feed.title || 'WordPress Author',
        content: item.contentEncoded || item.content || '',
        contentSnippet: item.contentSnippet || (item.content ? item.content.replace(/<[^>]+>/g, '').slice(0, 200) + '...' : ''),
        categories: categories.filter(Boolean),
        imageUrl: imageUrl || undefined,
      };
    });

    res.json({
      title: feed.title || 'woutertest123vw WordPress Site',
      description: feed.description || 'Latest news & updates from WordPress feed',
      link: feed.link || 'https://woutertest123vw.wordpress.com',
      feedUrl,
      posts,
    });
  } catch (err: any) {
    console.error('[WordPress Feed Fetch Error]', err.message || err);
    
    // Fallback: Try fetching WordPress Public REST API
    try {
      const restRes = await fetch('https://public-api.wordpress.com/wp/v2/sites/woutertest123vw.wordpress.com/posts?_embed');
      if (restRes.ok) {
        const restPosts: any[] = await restRes.json();
        const posts = restPosts.map((p) => ({
          id: p.id,
          title: p.title?.rendered || 'Untitled Post',
          link: p.link || '',
          pubDate: p.date || new Date().toISOString(),
          creator: p._embedded?.author?.[0]?.name || 'WordPress Author',
          content: p.content?.rendered || '',
          contentSnippet: p.excerpt?.rendered ? p.excerpt.rendered.replace(/<[^>]+>/g, '') : '',
          categories: [],
          imageUrl: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || undefined,
        }));

        res.json({
          title: 'woutertest123vw WordPress Site',
          description: 'Latest blog posts and announcements',
          link: 'https://woutertest123vw.wordpress.com',
          feedUrl,
          posts,
        });
        return;
      }
    } catch (restErr: any) {
      console.error('[WordPress REST API Error]', restErr.message || restErr);
    }

    res.status(500).json({
      message: `Failed to load WordPress feed from ${feedUrl}`,
      error: err.message || String(err),
    });
  }
});

export default router;
