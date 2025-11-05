import { ChatFormType, ChatRole, ChatType } from "../utils/constants";
import { MessageStatus } from "../utils/messageUtils";

// payloads

type WritingPayload_User = { title: string; text: string };
type WritingPayload_AI = {
  overallScore: number;
  writingId: string;
  feedback: string;
};

type MathPayload_User = { 
  problemType?: string; 
  difficulty?: string; 
};

type MathPayload_AI = { 
  score?: number; 
  mathId?: string; 
  correctAnswer?: string;
  solution?: string;
  feedback?: string;
  hintsUsed?: string[];
};

// messages
type BaseMessage = {
  _id?: string;
  tempId?: string;           // Temporary ID for optimistic UI
  role: ChatRole;
  type: ChatType;
  content: string;
  date?: Date;
  status?: MessageStatus;    // Message send status
  error?: string;            // Error message if send failed
  retryable?: boolean;       // Whether message can be retried
  formType?: ChatFormType;   // Form type for FORM messages
  payload?: WritingPayload_User | WritingPayload_AI | MathPayload_User | MathPayload_AI; // Typed payload for FORM messages
};

type TextMessage = BaseMessage & { 
  type: ChatType.TEXT;
  formType?: never;
  payload?: never;
};

type WritingMessage_User = BaseMessage & {
  type: ChatType.FORM;
  formType: ChatFormType.WRITING;
  role: ChatRole.USER;
  payload: WritingPayload_User;
};

type WritingMessage_AI = BaseMessage & {
  type: ChatType.FORM;
  formType: ChatFormType.WRITING;
  role: ChatRole.AI;
  payload: WritingPayload_AI;
};

type MathMessage_User = BaseMessage & {
  type: ChatType.FORM;
  formType: ChatFormType.MATH;
  role: ChatRole.USER;
  payload: MathPayload_User;
};

type MathMessage_AI = BaseMessage & {
  type: ChatType.FORM;
  formType: ChatFormType.MATH;
  role: ChatRole.AI;
  payload: MathPayload_AI;
};

type Message = TextMessage | WritingMessage_User | WritingMessage_AI | MathMessage_User | MathMessage_AI;

export type { 
  WritingPayload_User, 
  WritingMessage_AI, 
  MathPayload_User,
  MathPayload_AI,
  MathMessage_User,
  MathMessage_AI,
  Message 
};
