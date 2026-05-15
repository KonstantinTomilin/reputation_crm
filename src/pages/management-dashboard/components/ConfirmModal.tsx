interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText: string;
  danger?: boolean;
}

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText, danger }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-50 mx-auto">
          <i className="ri-alert-line text-red-500 text-xl" />
        </div>
        <h3 className="text-base font-bold text-gray-800 text-center">{title}</h3>
        <p className="text-sm text-gray-500 text-center">{message}</p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 text-sm font-semibold text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-900 hover:bg-blue-800'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}