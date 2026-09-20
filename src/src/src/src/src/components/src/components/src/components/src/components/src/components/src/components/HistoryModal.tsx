import React from 'react';
import { X, Trash2, MessageSquare, Plus } from 'lucide-react';
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
  if (!isOpen) return null;

  return (
    <div
      id="modal-history-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="modal-history-card"
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-md max-h-[80vh] rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl text-left"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800/80">
          <div>
            <h2 className="text-base font-semibold text-white">Chat History</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Your previous conversations</p>
          </div>
          <button
            id="btn-close-history-modal"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-neutral-950/50 border-b border-neutral-800/60">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-neutral-400" />
            <span>Start New Chat</span>
          </button>

          {sessions.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] text-neutral-500 hover:text-rose-400 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sessions.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              <MessageSquare className="mx-auto h-8 w-8 text-neutral-600 mb-2 opacity-50" />
              <p>No previous conversations</p>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  className={`group flex items-center justify-between rounded-xl border p-3 transition-colors ${
                    isActive
                      ? 'border-neutral-700 bg-neutral-800/80 text-white'
                      : 'border-neutral-800/80 bg-neutral-950/40 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSession(session);
                      onClose();
                    }}
                    className="flex-1 text-left truncate mr-2"
                  >
                    <p className="text-xs font-medium truncate">{session.title || 'Conversation'}</p>
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      {new Date(session.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-rose-400 transition-opacity"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
