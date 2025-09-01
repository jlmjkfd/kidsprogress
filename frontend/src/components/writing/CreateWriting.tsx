import { useState } from "react";
import { ChatFormType, ChatRole, ChatType } from "../../utils/constants";
//redux
import { useDispatch } from "react-redux";
import { addMessage, sendMessage } from "../../store/modules/chatSlice";
import { Message, WritingPayload_User } from "../../models/Message";
import { generateTempId, MessageStatus } from "../../utils/messageUtils";
import { Link } from "react-router-dom";
import { AppDispatch } from "../../store";
import { useTheme } from "../../contexts/ThemeContext";
import { getThemeClasses, getThemeIcons } from "../../utils/themeUtils";

function CreateWriting() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const { currentTheme } = useTheme();
  const themeClasses = getThemeClasses(currentTheme);
  const themeIcons = getThemeIcons(currentTheme);

  const handleSubmit = async () => {
    if (!title.trim() || !text.trim()) {
      setError("Don't forget to add a title and write your story! ✏️");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Generate temporary ID for optimistic UI
      const tempId = generateTempId();

      const payload: WritingPayload_User = {
        title: title,
        text: text,
      };

      const userMsg: Message = {
        tempId,
        role: ChatRole.USER,
        type: ChatType.FORM,
        formType: ChatFormType.WRITING,
        content: `Title: ${title}`, // Show title in content for better UX
        payload: payload,
        status: MessageStatus.SENDING,
        date: new Date(),
      };

      // Add message immediately to UI (optimistic update)
      dispatch(addMessage(userMsg));

      // Send message to server with temp ID handling
      await dispatch(sendMessage({ tempId, message: userMsg }));

      setSubmitted(true);
      setTimeout(() => {
        setTitle("");
        setText("");
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      setError("Oops! Something went wrong. Please try again! 🔄");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`w-full p-4 lg:p-6 space-y-6 min-h-screen bg-gradient-to-br ${currentTheme.colors.gradients.background}`}
    >
      {/* Back Button */}
      <Link
        to="/writing"
        className={`inline-flex items-center space-x-2 ${themeClasses.primaryText} hover:opacity-80 font-medium transition-colors duration-200 group`}
      >
        <span className="group-hover:-translate-x-1 transition-transform duration-200">
          ←
        </span>
        <span>Back to Stories</span>
      </Link>

      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className={`text-4xl font-bold bg-gradient-to-r ${currentTheme.colors.gradients.primary} bg-clip-text text-transparent mb-2`}
        >
          {themeIcons.writing} Write Your Amazing Story!
        </h1>
        <p className="text-gray-600">
          Let your imagination flow and create something wonderful!
        </p>
      </div>

      {/* Writing Form */}
      <div className={`${themeClasses.card} overflow-hidden`}>
        {/* Form Header */}
        <div
          className={`bg-gradient-to-r ${currentTheme.colors.gradients.primary} text-white p-6`}
        >
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{themeIcons.writing}</span>
            <div>
              <h2 className="text-2xl font-bold">Story Creator</h2>
              <p className="text-white/80">
                Every great story starts with a single word!
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8 space-y-6">
          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-lg font-semibold text-gray-700 flex items-center space-x-2">
              <span>🎯</span>
              <span>Story Title</span>
            </label>
            <input
              type="text"
              placeholder="What's your story about? (e.g., My Amazing Adventure)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full ${themeClasses.input} rounded-2xl p-4 text-lg focus:outline-none transition-all duration-200 placeholder-gray-400`}
              disabled={isLoading}
            />
            <p className="text-sm text-gray-500 ml-2">
              Give your story an exciting title!
            </p>
          </div>

          {/* Text Area */}
          <div className="space-y-2">
            <label className="text-lg font-semibold text-gray-700 flex items-center space-x-2">
              <span>📖</span>
              <span>Your Story</span>
            </label>
            <div className="relative">
              <textarea
                rows={12}
                placeholder="Once upon a time... Write your amazing story here! Remember to use describing words and tell us what happened, how you felt, and what you learned!"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`w-full ${themeClasses.input} rounded-2xl p-4 text-lg focus:outline-none transition-all duration-200 placeholder-gray-400 leading-relaxed resize-none`}
                disabled={isLoading}
              />
              <div className="absolute bottom-4 right-4 text-sm text-gray-400">
                {text.length} characters
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500">
                {themeIcons.loading} Tips:
              </span>
              <span
                className={`text-xs bg-gradient-to-r ${currentTheme.colors.gradients.background} ${themeClasses.primaryText} px-2 py-1 rounded-full`}
              >
                Use describing words
              </span>
              <span
                className={`text-xs bg-gradient-to-r ${currentTheme.colors.gradients.background} ${themeClasses.primaryText} px-2 py-1 rounded-full`}
              >
                Tell your feelings
              </span>
              <span
                className={`text-xs bg-gradient-to-r ${currentTheme.colors.gradients.background} ${themeClasses.primaryText} px-2 py-1 rounded-full`}
              >
                What did you learn?
              </span>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center space-x-3">
              <span className="text-2xl">⚠️</span>
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}

          {submitted && (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex items-center space-x-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-green-700 font-bold">
                  Awesome! Your story has been submitted!
                </p>
                <p className="text-green-600 text-sm">
                  Check the chat to see your feedback! ✨
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !title.trim() || !text.trim()}
              className={`
                px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200 transform
                flex items-center space-x-3 min-w-[200px] justify-center
                ${
                  isLoading || !title.trim() || !text.trim()
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : `bg-gradient-to-r ${currentTheme.colors.gradients.primary} text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95`
                }
              `}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Getting feedback...</span>
                </>
              ) : (
                <>
                  <span>Submit My Story</span>
                  <span className="text-xl">
                    {currentTheme.name === "universe" ? "🚀" : "🦕"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Encouragement Box */}
      <div
        className={`bg-gradient-to-r ${currentTheme.colors.gradients.background} border-2 ${themeClasses.primaryBorder} rounded-3xl p-6 text-center`}
      >
        <div className="text-4xl mb-3">{themeIcons.success}</div>
        <h3 className={`text-xl font-bold ${themeClasses.primaryText} mb-2`}>
          You're doing great!
        </h3>
        <p className="text-gray-600">
          Every story you write makes you a better writer. Keep practicing and
          have fun! Remember, there's no such thing as a perfect story - just
          YOUR unique story! {currentTheme.name === "universe" ? "💫" : "🌿"}
        </p>
      </div>
    </div>
  );
}
export default CreateWriting;
