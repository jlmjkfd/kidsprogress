import { Message } from "../../models/Message";

function UserTextMessage({ msg }: { msg: Message }) {
  return (
    <div className="self-end bg-blue-100 text-right px-4 py-2 rounded max-w-xl ml-auto">
      {msg.content}
    </div>
  );
}
export default UserTextMessage;
