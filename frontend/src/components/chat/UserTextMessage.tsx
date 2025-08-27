import { Message } from "../../models/Message";

function UserTextMessage({ msg }: { msg: Message }) {
  return (
    <div className="flex justify-end items-start space-x-2 group">
      <div className="max-w-xs lg:max-w-md">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-2xl rounded-br-sm shadow-lg">
          <p className="text-sm lg:text-base leading-relaxed">{msg.content}</p>
        </div>
        <div className="flex justify-end mt-1">
          <span className="text-xs text-gray-400">
            {msg.date ? new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
          </span>
        </div>
      </div>
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
        <span className="text-white text-sm">😊</span>
      </div>
    </div>
  );
}
export default UserTextMessage;
