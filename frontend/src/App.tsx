import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { useState } from "react";
import "./App.css";
import Header from "./components/Header";
import { Sidebar, MenuItem } from "./components/Sidebar";
import ChatWindow from "./components/chat/ChatWindow";
import WritingListPage from "./components/writing/WritingListPage";
import WritingDetailPage from "./components/writing/WritingDetailPage";
import CreateWriting from "./components/writing/CreateWriting";
import HomePage from "./pages/HomePage";
import MathPage from "./pages/MathPage";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const menuData: MenuItem[] = [
    {
      label: "Language",
      icon: "🎨",
      children: [
        {
          label: "English",
          icon: "🇺🇸",
          children: [
            {
              label: "Writing",
              icon: "✏️",
              path: "/writing",
            },
          ],
        },
      ],
    },
    {
      label: "Math",
      icon: "🔢",
      path: "/math",
    },
  ];

  return (
    <Router>
      <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="flex-shrink-0">
          <Header />
        </div>

        {/* Mobile Layout */}
        <div className="xl:hidden flex-1 flex flex-col">
          {/* Mobile Menu Button */}
          <div className="fixed top-16 left-4 z-50">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              data-testid="mobile-sidebar-toggle"
              className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110"
            >
              <span className="text-xl">📚</span>
            </button>
          </div>

          {/* Mobile Chat Button */}
          <div className="fixed top-16 right-4 z-50">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              data-testid="mobile-chat-toggle"
              className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110"
            >
              <span className="text-xl">💬</span>
            </button>
          </div>

          {/* Mobile Sidebar Overlay */}
          {isSidebarOpen && (
            <div className="fixed inset-0 z-40">
              <div
                className="absolute inset-0 bg-black opacity-50"
                onClick={() => setIsSidebarOpen(false)}
              />
              <div className="absolute left-0 top-16 bottom-0 w-80 bg-white rounded-r-3xl shadow-2xl overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-purple-400 to-pink-400">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    🌟 My Learning
                  </h2>
                  <p className="text-purple-100">Choose what to learn!</p>
                </div>
                <div className="p-4 overflow-y-auto">
                  <Sidebar items={menuData} />
                </div>
              </div>
            </div>
          )}

          {/* Mobile Chat Overlay */}
          {isChatOpen && (
            <div className="fixed inset-0 z-40">
              <div
                className="absolute inset-0 bg-black opacity-50"
                onClick={() => setIsChatOpen(false)}
              />
              <div className="absolute right-0 top-16 bottom-0 w-full max-w-md bg-white rounded-l-3xl shadow-2xl">
                <div className="p-2 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-semibold text-purple-700">
                    💬 AI Teacher
                  </h3>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    data-testid="close-chat"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <ChatWindow />
              </div>
            </div>
          )}

          {/* Mobile Main Content */}
          <main className="flex-1 pt-16 px-4 pb-6 overflow-auto">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/writing" element={<WritingListPage />} />
              <Route path="/writing/create" element={<CreateWriting />} />
              <Route path="/writing/:id" element={<WritingDetailPage />} />
              <Route path="/math" element={<MathPage />} />
            </Routes>
          </main>
        </div>

        {/* Desktop Layout */}
        <div className="hidden xl:flex flex-1 overflow-hidden">
          {/* Fixed Desktop Sidebar */}
          <aside
            className={`
            ${isSidebarCollapsed ? "w-20" : "w-80"} 
            bg-white border-r border-purple-200 shadow-lg flex flex-col transition-all duration-300
          `}
          >
            <div
              className={`
              ${isSidebarCollapsed ? "p-3" : "p-6"} 
              bg-gradient-to-r from-purple-400 to-pink-400 flex-shrink-0 transition-all duration-300
            `}
            >
              <div className="flex items-center justify-between">
                {!isSidebarCollapsed && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      🌟 My Learning
                    </h2>
                    <p className="text-purple-100">Choose what to learn!</p>
                  </div>
                )}
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="text-white hover:text-purple-200 transition-colors duration-200 p-1 rounded"
                  title={
                    isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
                >
                  <span className="text-xl">
                    {isSidebarCollapsed ? "▶️" : "◀️"}
                  </span>
                </button>
              </div>
            </div>
            <div
              className={`flex-1 ${
                isSidebarCollapsed ? "p-2" : "p-4"
              } overflow-y-auto transition-all duration-300`}
            >
              <Sidebar items={menuData} collapsed={isSidebarCollapsed} />
            </div>
          </aside>

          {/* Desktop Main Content with proper width constraints */}
          <main className="flex-1 overflow-auto min-w-0">
            <div className="w-full max-w-none">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/writing" element={<WritingListPage />} />
                <Route path="/writing/create" element={<CreateWriting />} />
                <Route path="/writing/:id" element={<WritingDetailPage />} />
                <Route path="/math" element={<MathPage />} />
              </Routes>
            </div>
          </main>

          {/* Fixed Desktop Chat */}
          {!isChatMinimized ? (
            <aside className="w-96 border-l border-purple-200 bg-white shadow-lg flex flex-col">
              <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex-shrink-0">
                <h3 className="font-semibold flex items-center space-x-2">
                  <span>💬</span>
                  <span>AI Teacher</span>
                </h3>
                <button
                  onClick={() => setIsChatMinimized(true)}
                  className="text-blue-100 hover:text-white transition-colors duration-200"
                >
                  ➖
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatWindow />
              </div>
            </aside>
          ) : (
            /* Minimized Chat Button */
            <div className="fixed bottom-4 right-4 z-50">
              <button
                onClick={() => setIsChatMinimized(false)}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white p-4 rounded-full shadow-xl transition-all duration-300 transform hover:scale-110 animate-pulse"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xl">💬</span>
                  <span className="text-sm font-semibold">Chat</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </Router>
  );
}

export default App;
