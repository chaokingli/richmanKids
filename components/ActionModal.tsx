import React from 'react';

interface ActionModalProps {
  title: string;
  description: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  isOpen: boolean;
  type?: 'info' | 'decision';
}

const ActionModal: React.FC<ActionModalProps> = ({
  title, description, onConfirm, onCancel, confirmText = "OK", cancelText = "Cancel", isOpen, type = 'info'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full pop-shadow-lg border-4 border-black animate-in zoom-in duration-200">
        <h2 className="text-2xl font-bold mb-4 text-center text-indigo-600">{title}</h2>
        <p className="text-lg text-gray-700 mb-8 text-center">{description}</p>
        
        <div className="flex gap-4 justify-center">
          {type === 'decision' && onCancel && (
            <button 
              onClick={onCancel}
              className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-b-4 border-red-300 active:border-b-0 active:translate-y-1 transition-all"
            >
              {cancelText}
            </button>
          )}
          <button 
            onClick={onConfirm}
            className="px-8 py-3 bg-green-400 hover:bg-green-500 text-white font-bold rounded-xl border-b-4 border-green-600 active:border-b-0 active:translate-y-1 transition-all pop-shadow"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;