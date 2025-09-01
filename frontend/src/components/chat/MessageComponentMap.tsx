import { Message } from "../../models/Message";
import { ChatFormType, ChatRole } from "../../utils/constants";
import AiWritingMessage from "./AiWritingMessage";
import UserWritingMessage from "./UserWritingMessage";
import AiMathMessage from "./AiMathMessage";
import UserMathMessage from "./UserMathMessage";

//FormMap

export type ExtractMessageByFormAndRole<
  F extends ChatFormType,
  R extends ChatRole
> = Extract<Message, { formType: F; role: R }>;

// Component props type that includes optional onRetry for user components
type MessageComponentProps<T extends Message> = {
  msg: T;
  onRetry?: T extends { role: ChatRole.USER } ? () => void : never;
};

type FormComponentMap = {
  [F in ChatFormType]: {
    [R in ChatRole]: React.ComponentType<
      MessageComponentProps<ExtractMessageByFormAndRole<F, R>>
    >;
  };
};

export const formMessageMap: FormComponentMap = {
  [ChatFormType.WRITING]: {
    [ChatRole.USER]: UserWritingMessage,
    [ChatRole.AI]: AiWritingMessage,
  },
  [ChatFormType.MATH]: {
    [ChatRole.USER]: UserMathMessage,
    [ChatRole.AI]: AiMathMessage,
  },
};

// Utility functions for better component selection
export const getMessageComponent = (formType: ChatFormType, role: ChatRole) => {
  return formMessageMap[formType]?.[role];
};

export const hasMessageComponent = (formType: ChatFormType, role: ChatRole): boolean => {
  return !!(formMessageMap[formType] && formMessageMap[formType][role]);
};

export const getSupportedFormTypes = (): ChatFormType[] => {
  return Object.keys(formMessageMap) as ChatFormType[];
};
