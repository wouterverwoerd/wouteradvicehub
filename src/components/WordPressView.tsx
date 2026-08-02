import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, Search, ExternalLink, Calendar, User, Tag, BookOpen, X, Rss, AlertCircle } from 'lucide-react';
import { WordPressFeedInfo, WordPressPost } from '../types';
import { MediaPreview } from './MediaPreview';

export const WordPressView: React.FC = () => {
  const [feedInfo, setFeedInfo] = useState<WordPressFeedInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPost, setSelectedPost] = useState<WordPressPost | null>(null);
  const [customFeedUrl, setCustomFeedUrl] = useState<string>('https://woutertest123vw.wordpress.com/feed/');

  const fetchFeed = async (url?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const targetUrl = url || customFeedUrl;
      const res = await fetch(`/wordpress?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch WordPress feed');
      }

      setFeedInfo(data);
    } catch (err: any) {
      console.error('Error fetching WordPress feed:', err);
      setError(err.message || 'Could not load WordPress content');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFeed(customFeedUrl);
  };

  const filteredPosts = (feedInfo?.posts || []).filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.contentSnippet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (post.creator && post.creator.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Feed Banner Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {feedInfo?.title || 'WordPress Feed Reader'}
                </h2>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Rss className="w-3 h-3" />
                  <span>Live Feed</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {feedInfo?.description || 'Reading posts directly from WordPress RSS & REST endpoints.'}
              </p>
              {feedInfo?.link && (
                <a
                  href={feedInfo.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-1 hover:underline"
                >
                  <span>Visit WordPress Site ({feedInfo.link})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => fetchFeed()}
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Feed</span>
            </button>
          </div>
        </div>

        {/* Feed URL Bar */}
        <form onSubmit={handleCustomSubmit} className="pt-3 border-t border-slate-100 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Feed URL:</span>
            <input
              type="url"
              value={customFeedUrl}
              onChange={(e) => setCustomFeedUrl(e.target.value)}
              placeholder="https://woutertest123vw.wordpress.com/feed/"
              className="w-full pl-20 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-all whitespace-nowrap shadow-sm"
          >
            Load URL
          </button>
        </form>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search WordPress posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{filteredPosts.length}</strong> of <strong>{feedInfo?.posts.length || 0}</strong> posts
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-semibold">{error}</p>
            <p className="text-rose-600 mt-0.5">Check that the WordPress feed URL is public and accessible.</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
              <div className="h-20 bg-slate-100 rounded"></div>
              <div className="h-3 bg-slate-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Posts Cards Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              {post.imageUrl && (
                <div className="h-48 w-full bg-slate-100 overflow-hidden relative">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(post.pubDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </span>
                    {post.creator && (
                      <span className="flex items-center space-x-1">
                        <User className="w-3.5 h-3.5" />
                        <span>{post.creator}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {post.contentSnippet}
                  </p>

                  {post.link && (
                    <MediaPreview
                      urlOrFilename={post.imageUrl || post.link}
                      title={post.title}
                      label="Linked Media / Post Web View"
                      compact={true}
                    />
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedPost(post)}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Read Article</span>
                  </button>

                  {post.link && (
                    <a
                      href={post.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Open on WordPress"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredPosts.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 font-semibold text-sm">No WordPress posts found.</p>
              <p className="text-xs text-slate-400 mt-1">Try refreshing or entering a different feed URL above.</p>
            </div>
          )}
        </div>
      )}

      {/* Full Post Reader Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden relative">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="pr-4">
                <span className="text-xs text-blue-600 font-semibold">WordPress Post</span>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">{selectedPost.title}</h3>
                <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                  <span>Published: {new Date(selectedPost.pubDate).toLocaleString()}</span>
                  {selectedPost.creator && <span>• By {selectedPost.creator}</span>}
                </div>
              </div>

              <button
                onClick={() => setSelectedPost(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 prose prose-slate max-w-none text-sm text-slate-800 leading-relaxed">
              {selectedPost.imageUrl && (
                <img
                  src={selectedPost.imageUrl}
                  alt={selectedPost.title}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-72 object-cover rounded-xl mb-4"
                />
              )}

              {selectedPost.content ? (
                <div
                  dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                  className="wordpress-article-body space-y-3"
                />
              ) : (
                <p className="whitespace-pre-line">{selectedPost.contentSnippet}</p>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              {selectedPost.link ? (
                <a
                  href={selectedPost.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs shadow-sm transition-all"
                >
                  <span>View Original Post on WordPress</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <div></div>
              )}

              <button
                onClick={() => setSelectedPost(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
