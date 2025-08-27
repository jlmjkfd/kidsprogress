import { ChatFormType, ChatRole } from "../../utils/constants";
import { ExtractMessageByFormAndRole } from "./MessageComponentMap";

function UserWritingMessage({
  msg,
}: {
  msg: ExtractMessageByFormAndRole<ChatFormType.WRITING, ChatRole.USER>;
}) {
  return (
    <div className="flex justify-end items-start space-x-2 group">
      <div className="max-w-xs lg:max-w-md">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl rounded-br-sm shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-white/20 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">✏️</span>
              <span className="text-sm font-semibold">My Writing</span>
            </div>
            <span className="text-xs opacity-80">
              {msg.date ? new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
            </span>
          </div>
          
          {/* Content */}
          <div className="p-4">
            <h3 className="text-lg font-bold mb-2 text-yellow-200">{msg.payload?.title}</h3>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm leading-relaxed line-clamp-4">{msg.payload?.text}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
        <span className="text-white text-sm">😊</span>
      </div>
    </div>
  );
}
export default UserWritingMessage;
