import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  MessageSquare, 
  Calendar, 
  ArrowRight, 
  Trash2, 
  Download, 
  Plus, 
  Tag, 
  Bot, 
  Flame, 
  Pin,
  Compass
} from 'lucide-react';
import { HistorySession, ChatMessage } from '../types';

interface StoryViewProps {
  sessions: HistorySession[];
  currentSessionId: string | null;
  onSelectStory: (id: string) => void;
  onNewStory: () => void;
  onDeleteStory: (id: string) => void;
  onClose: () => void;
}

export const StoryView: React.FC<StoryViewProps> = ({
  sessions,
  currentSessionId,
  onSelectStory,
  onNewStory,
  onDeleteStory,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Categorize or detect topics from session messages
  const storiesWithMeta = useMemo(() => {
    return sessions.map((session) => {
      const msgCount = session.messages.length;
      const textContent = session.messages.map((m) => m.content).join(' ').toLowerCase();

      let tag = 'General';
      let tagColor = 'text-cyan-400 bg-cyan-950/60 border-cyan-800/40';

      if (
        textContent.includes('anime') ||
        textContent.includes('mc') ||
        textContent.includes('manga') ||
        textContent.includes('naruto') ||
        textContent.includes('death note') ||
        textContent.includes('character')
      ) {
        tag = 'Anime & Lore';
        tagColor = 'text-rose-400 bg-rose-950/60 border-rose-800/40';
      } else if (
        textContent.includes('code') ||
        textContent.includes('function') ||
        textContent.includes('python') ||
        textContent.includes('javascript') ||
        textContent.includes('react')
      ) {
        tag = 'Tech & Code';
        tagColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40';
      } else if (
        textContent.includes('story') ||
        textContent.includes('universe') ||
        textContent.includes('robot') ||
        textContent.includes('luxion')
      ) {
        tag = 'Cyber Story';
        tagColor = 'text-purple-400 bg-purple-950/60 border-purple-800/40';
      }

      // Find first user and assistant messages for excerpt
      const firstUserMsg = session.messages.find((m) => m.role === 'user');
      const firstBotMsg = session.messages.find((m) => m.role === 'assistant');

      return {
        ...session,
        tag,
        tagColor,
        msgCount,
        firstUserPrompt: firstUserMsg?.content || 'Untitled Query',
        firstBotExcerpt: firstBotMsg?.content?.slice(0, 140) || 'Archived conversation with LUXION.',
      };
    });
  }, [sessions]);

  // Filter based on search and tag
  const filteredStories = useMemo(() => {
    return storiesWithMeta.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.firstUserPrompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.firstBotExcerpt.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (selectedTag === 'all') return true;
      if (selectedTag === 'anime') return s.tag === 'Anime & Lore';
      if (selectedTag === 'tech') return s.tag === 'Tech & Code';
      if (selectedTag === 'cyber') return s.tag === 'Cyber Story';
      return true;
    });
  }, [storiesWithMeta, searchQuery, selectedTag]);

  const handleExportStory = (e: React.MouseEvent, session: HistorySession) => {
    e.stopPropagation();
    const md = `# ${session.title}\n*Archived LUXION Cyber Story Log*\nDate: ${new Date(session.updatedAt).toLocaleString()}\n\n---\n\n` +
      session.messages
        .map((m) => `### ${m.role === 'assistant' ? 'LUXION (Model X-01)' : 'Human'}\n\n${m.content}\n\n`)
        .join('---\n\n');

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_story.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl h-[88vh] bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header HUD */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-amber-500/30 flex items-center justify-center shadow-md text-amber-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">LUXION Stories &amp; Archives</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 text-amber-300 border border-amber-500/30">
                  {storiesWithMeta.length} Stories
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Explore, review, and resume past conversational sessions and notes with LUXION.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNewStory();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-neutral-200 text-neutral-950 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Story</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Search & Tag Filter Bar */}
        <div className="px-6 py-3 border-b border-neutral-800/80 bg-neutral-900/30 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in story titles, queries, or notes..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-2.5 py-1 rounded-md transition-all font-mono text-[11px] ${
                selectedTag === 'all'
                  ? 'bg-neutral-200 text-neutral-900 font-semibold shadow'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              All Stories
            </button>
            <button
              onClick={() => setSelectedTag('anime')}
              className={`px-2.5 py-1 rounded-md transition-all font-mono text-[11px] flex items-center gap-1 ${
                selectedTag === 'anime'
                  ? 'bg-amber-400 text-neutral-950 font-semibold shadow'
                  : 'bg-neutral-900 text-neutral-400 hover:text-amber-300'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-300" />
              Anime &amp; Lore
            </button>
            <button
              onClick={() => setSelectedTag('tech')}
              className={`px-2.5 py-1 rounded-md transition-all font-mono text-[11px] flex items-center gap-1 ${
                selectedTag === 'tech'
                  ? 'bg-emerald-400 text-neutral-950 font-semibold shadow'
                  : 'bg-neutral-900 text-neutral-400 hover:text-emerald-300'
              }`}
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Tech &amp; Code
            </button>
            <button
              onClick={() => setSelectedTag('cyber')}
              className={`px-2.5 py-1 rounded-md transition-all font-mono text-[11px] flex items-center gap-1 ${
                selectedTag === 'cyber'
                  ? 'bg-purple-400 text-neutral-950 font-semibold shadow'
                  : 'bg-neutral-900 text-neutral-400 hover:text-purple-300'
              }`}
            >
              <Bot className="w-3 h-3 text-purple-400" />
              Creative
            </button>
          </div>
        </div>

        {/* Stories Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredStories.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Compass className="w-12 h-12 text-neutral-600 mb-3 animate-pulse" />
              <h3 className="text-sm font-semibold text-neutral-300 mb-1">No matching stories found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mb-4">
                Start a new chat to begin an anime character discovery, creative roleplay, or deep reasoning story!
              </p>
              <button
                onClick={() => {
                  onNewStory();
                  onClose();
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-lg shadow-cyan-600/20"
              >
                Launch First Story
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStories.map((story) => {
                const isActive = story.id === currentSessionId;
                return (
                  <div
                    key={story.id}
                    onClick={() => {
                      onSelectStory(story.id);
                      onClose();
                    }}
                    className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'bg-neutral-900 border-amber-500/70 ring-1 ring-amber-500/20 shadow-md'
                        : 'bg-neutral-900/40 hover:bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${story.tagColor}`}
                        >
                          {story.tag}
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleExportStory(e, story)}
                            title="Export Markdown"
                            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteStory(story.id);
                            }}
                            title="Delete Story"
                            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-semibold text-neutral-100 line-clamp-1 group-hover:text-amber-200 transition-colors">
                        {story.title}
                      </h4>

                      {/* Excerpt */}
                      <p className="mt-2 text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                        {story.firstBotExcerpt}
                      </p>
                    </div>

                    {/* Bottom Metadata & Continue Button */}
                    <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500">
                      <div className="flex items-center gap-3 tabular-nums font-mono text-[10px]">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {story.msgCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(story.updatedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-semibold text-amber-300 group-hover:translate-x-0.5 transition-transform">
                        <span>Read</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
