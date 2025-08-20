import { ChatFormType, ChatRole, ChatType } from "../utils/constants";

// payloads

type WritingPayload_User = { title: string; text: string };
type WritingPayload_AI = {
  overallScore: number;
  writingId: string;
  feedback: string;
};

// type MathPayload_User = { questionCount: number };
// type MathPayload_AI = { score: number; mathId: string };

// messages
type BaseMessage = {
  _id?: string;
  role: ChatRole;
  type: ChatType;
  content: string;
  date?: Date;
};

type TextMessage = BaseMessage & { type: ChatType.TEXT };

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

type Message = TextMessage | WritingMessage_User | WritingMessage_AI;

export type { WritingPayload_User, WritingMessage_AI, Message };
