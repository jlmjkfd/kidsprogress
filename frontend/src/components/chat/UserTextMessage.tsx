import { Message } from "../../models/Message";
import { MessageStatus } from "../../utils/messageUtils";
import { useTheme } from "../../contexts/ThemeContext";

interface UserTextMessageProps {
  msg: Message;
  onRetry?: () => void;
}

function UserTextMessage({ msg, onRetry }: UserTextMessageProps) {
  const { currentTheme } = useTheme();
  const getStatusIcon = () => {
    switch (msg.status) {
      case MessageStatus.SENDING:
        return (
          <div className="flex space-x-0.5">
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        );
      case MessageStatus.SENT:
        return <span className="text-white text-xs">✓</span>;
      case MessageStatus.FAILED:
        return <span className="text-red-300 text-xs">⚠️</span>;
      default:
        return <span className="text-white text-sm">😊</span>;
    }
  };

  const getMessageStyle = () => {
    if (msg.status === MessageStatus.FAILED) {
      return "bg-gradient-to-r from-red-400 to-red-500 text-white px-4 py-3 rounded-2xl rounded-br-sm shadow-lg border-2 border-red-300";
    }
    return `bg-gradient-to-r ${currentTheme.colors.gradients.primary} text-white px-4 py-3 rounded-2xl rounded-br-sm shadow-lg`;
  };

  return (
    <div className="flex justify-end items-start space-x-2 group">
      <div className="max-w-xs lg:max-w-md">
        <div className={getMessageStyle()}>
          <p className="text-sm lg:text-base leading-relaxed">{msg.content}</p>
          
          {/* Error message */}
          {msg.status === MessageStatus.FAILED && msg.error && (
            <p className="text-xs text-red-100 mt-1 italic">{msg.error}</p>
          )}
          
          {/* Retry button */}
          {msg.status === MessageStatus.FAILED && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors"
            >
              Retry
            </button>
          )}
        </div>
        
        <div className="flex justify-end mt-1 items-center space-x-2">
          <span className="text-xs text-gray-400">
            {msg.date ? new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
          </span>
          
          {/* Status indicator */}
          {msg.status && (
            <div className="flex items-center">
              {getStatusIcon()}
            </div>
          )}
        </div>
      </div>
      
      <div className={`flex-shrink-0 w-8 h-8 bg-gradient-to-r ${currentTheme.colors.gradients.primary} rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}>
        <span className="text-white text-sm">{currentTheme.name === 'universe' ? '🚀' : '🦕'}</span>
      </div>
    </div>
  );
}
export default UserTextMessage;
