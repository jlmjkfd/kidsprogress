import { Message } from "../../models/Message";
import { ChatFormType, ChatRole } from "../../utils/constants";
import AiWritingMessage from "./AiWritingMessage";
import UserWritingMessage from "./UserWritingMessage";

//FormMap

export type ExtractMessageByFormAndRole<
  F extends ChatFormType,
  R extends ChatRole
> = Extract<Message, { formType: F; role: R }>;

type FormComponentMap = {
  [F in ChatFormType]: {
    [R in ChatRole]: React.ComponentType<{
      msg: ExtractMessageByFormAndRole<F, R>;
    }>;
  };
};

export const formMessageMap: FormComponentMap = {
  [ChatFormType.WRITING]: {
    [ChatRole.USER]: UserWritingMessage,
    [ChatRole.AI]: AiWritingMessage,
  },
};
