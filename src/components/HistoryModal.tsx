import React, { useState } from 'react';
import { X, Trash2, MessageSquare, Plus, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { HistorySession } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: HistorySession[];
  activeSessionId: string | null;
  onSelectSession: (session: HistorySession) => void;
  onDeleteSession: (id: string) => void;
  onNewChat: () => void;
  onClearAll: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  onClearAll,
}) => {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (s.title || '').toLowerCase().includes(q);
    const msgMatch = (s.messages || []).some((m) => m.content.toLowerCase().includes(q));
    return titleMatch || msgMatch;
  });

  const handleConfirmClearAll = () => {
    onClearAll();
    setConfirmClearOpen(false);
  };

  return (
    <div
      id="modal-history-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="modal-history-card"
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl text-left overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-black">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-white shadow-sm">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">Conversation History</h2>
              <p className="text-[11px] text-neutral-400">Locally stored chat sessions</p>
            </div>
          </div>
          <button
            id="btn-close-history-modal"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            title="Close"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Bar: New Chat & Clear All */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-neutral-900/30 border-b border-neutral-800/60 gap-3">
          <button
            type="button"
            id="btn-history-new-chat"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-950 bg-white hover:bg-neutral-200 transition-all shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>

          {sessions.length > 0 && (
            <button
              type="button"
              id="btn-history-clear-all"
              onClick={() => setConfirmClearOpen(true)}
              className="text-xs text-neutral-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-neutral-900"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Search Filter if multiple sessions */}
        {sessions.length > 2 && (
          <div className="px-5 pt-3 pb-1">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
            />
          </div>
        )}

        {/* Confirmation Dialog Overlay for Clear All */}
        {confirmClearOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-fade-in">
            <div className="max-w-sm rounded-xl border border-neutral-800 bg-neutral-950 p-5 text-center shadow-2xl">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Clear all chat history?</h3>
              <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                This will permanently delete all saved conversation logs.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(false)}
                  className="px-3.5 py-1.5 text-xs rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-all-history"
                  onClick={handleConfirmClearAll}
                  className="px-3.5 py-1.5 text-xs rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold transition-colors"
                >
                  Yes, Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sessions.length === 0 ? (
            <div className="py-14 text-center select-none">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900/80 border border-neutral-800 text-neutral-500">
                <MessageSquare className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-neutral-300">No conversations yet.</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                Start a new conversation with LUXION.
              </p>
              <button
                type="button"
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-neutral-950 bg-white hover:bg-neutral-200 transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Start a new conversation</span>
              </button>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-500">
              No conversations matched your search "{searchQuery}".
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const lastMsg = session.messages && session.messages.length > 0
                ? session.messages[session.messages.length - 1].content
                : '';
              const firstMsg = session.messages && session.messages.length > 0
                ? session.messages[0].content
                : '';
              const preview = (lastMsg || firstMsg || '').replace(/[#*`_]/g, '').trim();

              return (
                <div
                  key={session.id}
                  className={`group relative flex items-start justify-between rounded-xl border p-3.5 transition-all cursor-pointer ${
                    isActive
                      ? 'border-neutral-500 bg-neutral-900 text-white shadow-sm ring-1 ring-neutral-700'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900'
                  }`}
                  onClick={() => {
                    onSelectSession(session);
                    onClose();
                  }}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0" />
                      )}
                      <p className="text-xs font-semibold truncate text-white">
                        {session.title || 'Untitled Session'}
                      </p>
                    </div>

                    {preview && (
                      <p className="text-[11px] text-neutral-400 line-clamp-1 mt-1 font-sans">
                        {preview}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-neutral-500 font-mono tabular-nums">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>•</span>
                      <span>{(session.messages || []).length} messages</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
                      title="Delete conversation"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-amber-300 transition-colors hidden sm:block" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
