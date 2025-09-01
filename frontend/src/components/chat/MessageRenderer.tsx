import React from 'react';
import { Message } from "../../models/Message";
import { ChatType, ChatRole, ChatFormType } from "../../utils/constants";
import { formMessageMap } from "./MessageComponentMap";
import UserTextMessage from "./UserTextMessage";
import AiTextMessage from "./AiTextMessage";

interface MessageRendererProps {
  message: Message;
  messageKey: string;
  onRetry?: (tempId: string, message: Message) => void;
}

function MessageRenderer({ message, messageKey, onRetry }: MessageRendererProps) {
  // Handle text messages
  if (message.type === ChatType.TEXT) {
    return message.role === ChatRole.USER ? (
      <UserTextMessage
        key={messageKey}
        msg={message}
        onRetry={message.retryable && onRetry && message.tempId 
          ? () => onRetry(message.tempId!, message) 
          : undefined
        }
      />
    ) : (
      <AiTextMessage key={messageKey} msg={message} />
    );
  }

  // Handle form messages with type safety
  if (message.type === ChatType.FORM && message.formType) {
    const formType = message.formType;
    const role = message.role;
    
    // Type-safe component selection
    if (formType === ChatFormType.WRITING) {
      if (role === ChatRole.USER) {
        const Component = formMessageMap[ChatFormType.WRITING][ChatRole.USER];
        return (
          <Component
            key={messageKey}
            msg={message}
            onRetry={message.retryable && onRetry && message.tempId 
              ? () => onRetry(message.tempId!, message) 
              : undefined
            }
          />
        );
      } else {
        const Component = formMessageMap[ChatFormType.WRITING][ChatRole.AI];
        return <Component key={messageKey} msg={message} />;
      }
    }
    
    if (formType === ChatFormType.MATH) {
      if (role === ChatRole.USER) {
        const Component = formMessageMap[ChatFormType.MATH][ChatRole.USER];
        return (
          <Component
            key={messageKey}
            msg={message}
            onRetry={message.retryable && onRetry && message.tempId 
              ? () => onRetry(message.tempId!, message) 
              : undefined
            }
          />
        );
      } else {
        const Component = formMessageMap[ChatFormType.MATH][ChatRole.AI];
        return <Component key={messageKey} msg={message} />;
      }
    }
  }

  // Fallback for unknown message types
  console.warn('Unknown message type or formType:', message);
  return (
    <div key={messageKey} className="text-center text-gray-500 text-sm py-2">
      <span>⚠️ Unknown message type</span>
    </div>
  );
}

export default MessageRenderer;