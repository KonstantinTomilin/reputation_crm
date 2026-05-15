import { useState } from 'react';
import type { CRMLink } from '@/mocks/crm';

interface Props {
  link: CRMLink;
  clientName: string;
  projectName: string;
  onClose: () => void;
  onStart: (comment: string) => void;
}

export default function StartAuditModal({ link, clientName, projectName, onClose, onStart }: Props) {
  const [comment, setComment] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-800">Начать аудит</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[280px]" title={link.url}>{link.url}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-close-line text-gray-500" />
            </div>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Клиент</div>
              <div className="text-sm font-semibold text-gray-800 mt-0.5">{clientName}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Проект</div>
              <div className="text-sm font-semibold text-gray-800 mt-0.5">{projectName}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Тип</div>
              <div className="text-sm font-semibold text-gray-800 mt-0.5">
                {link.type === 'удаление+деиндексация' ? 'Удал+деинд' : link.type}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Гео</div>
              <div className="text-sm font-semibold text-gray-800 mt-0.5">
                {link.geo ? link.geo.split(',')[0] : '—'}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
              Комментарий (опционально)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Примечания по ссылке..."
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 resize-none"
            />
            <div className="text-xs text-gray-400 mt-1">{comment.length}/500</div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Отмена
            </button>
            <button
              onClick={() => onStart(comment)}
              className="flex-1 px-4 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <div className="w-4 h-4 flex items-center justify-center inline-flex mr-1">
                <i className="ri-play-line" />
              </div>
              Начать аудит
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}