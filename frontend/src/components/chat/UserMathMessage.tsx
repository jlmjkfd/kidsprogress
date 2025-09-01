import { Message } from "../../models/Message";
import { ChatFormType, ChatRole } from "../../utils/constants";
import { MessageStatus } from "../../utils/messageUtils";

type MathMessage = Extract<Message, { formType: ChatFormType.MATH; role: ChatRole.USER }>;

interface UserMathMessageProps {
  msg: MathMessage;
  onRetry?: () => void;
}

function UserMathMessage({ msg, onRetry }: UserMathMessageProps) {
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
        return null;
    }
  };

  const getMessageStyle = () => {
    if (msg.status === MessageStatus.FAILED) {
      return "bg-gradient-to-r from-red-400 to-red-500 text-white border-2 border-red-300";
    }
    return "bg-gradient-to-r from-green-500 to-blue-500 text-white";
  };

  return (
    <div className="flex justify-end items-start space-x-2 group">
      <div className="max-w-xs lg:max-w-md">
        <div className={`${getMessageStyle()} px-4 py-3 rounded-2xl rounded-br-sm shadow-lg`}>
          {/* Math Problem Header */}
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">🧮</span>
            <span className="text-xs font-medium opacity-90">Math Problem</span>
          </div>
          
          {/* Math Content */}
          <div className="space-y-2">
            <p className="text-sm lg:text-base font-medium">
              {msg.content}
            </p>
            
            {/* Math-specific payload data */}
            {msg.payload && (
              <div className="bg-white/20 rounded-lg p-2 text-xs">
                {msg.payload.problemType && (
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-medium">{msg.payload.problemType}</span>
                  </div>
                )}
                {msg.payload.difficulty && (
                  <div className="flex justify-between">
                    <span>Level:</span>
                    <span className="font-medium">{msg.payload.difficulty}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Error message */}
          {msg.status === MessageStatus.FAILED && msg.error && (
            <p className="text-xs text-red-100 mt-2 italic">{msg.error}</p>
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
      
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
        <span className="text-white text-sm">🧮</span>
      </div>
    </div>
  );
}

export default UserMathMessage;