import { useState } from 'react';
import type { CRMLink } from '@/mocks/crm';
import StatusBadge from '@/components/base/StatusBadge';

interface Props {
  comments: { id: number; author: string; authorRole: string; text: string; createdAt: string }[];
  onAddComment: (text: string) => void;
}

export default function LinkComments({ comments, onAddComment }: Props) {
  const [newComment, setNewComment] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 text-xs text-blue-900 hover:text-blue-800 font-semibold cursor-pointer"
        title={`Комментарии (${comments.length})`}
      >
        <div className="w-4 h-4 flex items-center justify-center">
          <i className="ri-chat-3-line" />
        </div>
        {comments.length > 0 ? (
          <span className="bg-blue-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {comments.length}
          </span>
        ) : (
          <span className="text-gray-400">0</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-20 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Комментарии</span>
            <button onClick={() => setIsOpen(false)} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer">
              <i className="ri-close-line" />
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto flex flex-col gap-2 mb-3">
            {comments.length === 0 && (
              <p className="text-xs text-gray-400 py-2">Нет комментариев</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="bg-gray-50 rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-gray-700">{c.author}</span>
                  <span className="text-[10px] text-gray-400">{c.createdAt}</span>
                </div>
                <p className="text-xs text-gray-600">{c.text}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Новый комментарий..."
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-slate-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newComment.trim()) {
                  onAddComment(newComment.trim());
                  setNewComment('');
                }
              }}
            />
            <button
              onClick={() => {
                if (newComment.trim()) {
                  onAddComment(newComment.trim());
                  setNewComment('');
                }
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-colors cursor-pointer"
            >
              <i className="ri-add-line text-sm" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}