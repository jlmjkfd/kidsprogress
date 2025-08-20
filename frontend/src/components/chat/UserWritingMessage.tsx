import { ChatFormType, ChatRole } from "../../utils/constants";
import { ExtractMessageByFormAndRole } from "./MessageComponentMap";

function UserWritingMessage({
  msg,
}: {
  msg: ExtractMessageByFormAndRole<ChatFormType.WRITING, ChatRole.USER>;
}) {
  return (
    <div className="self-end ml-auto max-w-lg bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-xl p-4 shadow-sm">
      <div className="flex items-center mb-2">
        <span className="px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-200 rounded-full">
          Writing Submission
        </span>
        <span className="ml-auto text-xs text-gray-500">
          {msg.date ? new Date(msg.date).toLocaleString() : "Invalid Date"}
        </span>
      </div>
      <h3 className="text-lg font-bold text-gray-800">{msg.payload?.title}</h3>
      <p className="text-sm text-gray-600 line-clamp-3">{msg.payload?.text}</p>
    </div>
  );
}
export default UserWritingMessage;
