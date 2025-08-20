import { useState } from "react";
import { ChatFormType, ChatRole, ChatType } from "../../utils/constants";
// import { v4 as uuid } from "uuid";
//redux
import { useDispatch } from "react-redux";
import { pushMessage } from "../../store/modules/messagesSlice";
import { Message, WritingPayload_User } from "../../models/Message";
import axios from "axios";
import { Link } from "react-router-dom";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

function CreateWriting() {
  // const [title, setTitle] = useState("My day at school");
  // const [text, setText] = useState(
  //   "Today I had mandar lesson. I made snake because this year is the year of snake. At lunch playtime, I played my favourite game chase. It's my favourite game because I like running around. School is best!"
  // );
  const [title, setTitle] = useState("Movie Review");
  const [text, setText] = useState(
    "Yesterday, I went to stardome. I watched a movie called Astronauts. My favourite part was when I saw the astronauts were training in a very deep pool. I loved it so much!"
  );
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const dispatch = useDispatch();

  const handleSubmit = async () => {
    //e.preventDefault();
    if (!title.trim() || !text.trim()) {
      setError("Please input title and text");
      return;
    }

    const payload: WritingPayload_User = {
      title: title,
      text: text,
    };

    const userMsg: Message = {
      role: ChatRole.USER,
      type: ChatType.FORM,
      formType: ChatFormType.WRITING,
      content: "",
      payload: payload,
    };

    console.log(JSON.stringify(userMsg));
    const res = await axios.post(`${apiBaseUrl}/chat`, userMsg);
    console.log(">>>>>>>chat response");
    console.log(res);

    dispatch(pushMessage(userMsg));

    // setTitle("");
    // setText("");
    setError("");
    setSubmitted(true);
    const aiMsg = res.data.AIMsg;

    dispatch(pushMessage(aiMsg));
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md flex flex-col">
      <div>
        <Link to={"/writing"}>&lt;&lt;Back</Link>
      </div>
      <h2 className="text-2xl font-bold mb-4">Writing</h2>

      <div>
        <label className="block text-gray-700 font-medium mb-1">Title</label>
        <input
          type="text"
          placeholder="Please input title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-gray-700 font-medium mb-1">Text</label>
        <textarea
          rows={8}
          placeholder="Please input text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
      {submitted && (
        <div className="text-green-600 text-sm font-medium">
          Writing submitted!
        </div>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition cursor-pointer"
      >
        Submit
      </button>
    </div>
  );
}
export default CreateWriting;
