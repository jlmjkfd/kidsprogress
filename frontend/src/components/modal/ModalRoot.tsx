import { ReactNode } from 'react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BaseModal({ isOpen, onClose, children, title }: BaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-2xl border-2 border-purple-100 max-w-md w-full mx-4 transform transition-all">
          {/* Header */}
          {title && (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center space-x-2">
                  <span>✨</span>
                  <span>{title}</span>
                </h2>
                <button
                  onClick={onClose}
                  className="text-white hover:text-purple-200 transition-colors duration-200"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Content */}
          <div className="p-6">
            {children}
          </div>
          
          {/* Close button if no title */}
          {!title && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <span className="text-2xl">×</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Example modal components that could be used
interface SuccessModalProps {
  message: string;
  onClose: () => void;
}

export function SuccessModal({ message, onClose }: SuccessModalProps) {
  return (
    <BaseModal isOpen={true} onClose={onClose} title="Success!">
      <div className="text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <p className="text-gray-700 text-lg">{message}</p>
        <button
          onClick={onClose}
          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-2xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          Awesome!
        </button>
      </div>
    </BaseModal>
  );
}

interface ErrorModalProps {
  message: string;
  onClose: () => void;
}

export function ErrorModal({ message, onClose }: ErrorModalProps) {
  return (
    <BaseModal isOpen={true} onClose={onClose} title="Oops!">
      <div className="text-center space-y-4">
        <div className="text-6xl">😅</div>
        <p className="text-gray-700 text-lg">{message}</p>
        <button
          onClick={onClose}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-2xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          Try Again
        </button>
      </div>
    </BaseModal>
  );
}
