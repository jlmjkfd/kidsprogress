import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { useState } from "react";
import "./App.css";
import Header from "./components/Header";
import { Sidebar, MenuItem } from "./components/Sidebar";
import ChatWindow from "./components/chat/ChatWindow";
import WritingListPage from "./components/writing/WritingListPage";
import WritingDetailPage from "./components/writing/WritingDetailPage";
import CreateWriting from "./components/writing/CreateWriting";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const menuData: MenuItem[] = [
    {
      label: "🎨 Language",
      children: [
        {
          label: "🇺🇸 English",
          children: [
            {
              label: "✏️ Writing",
              path: "/writing",
            },
          ],
        },
      ],
    },
    {
      label: "🔢 Math",
    },
  ];

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Header />
        
        {/* Mobile Layout */}
        <div className="lg:hidden">
          {/* Mobile Menu Button */}
          <div className="fixed top-16 left-4 z-50">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110"
            >
              <span className="text-xl">📚</span>
            </button>
          </div>

          {/* Mobile Chat Button */}
          <div className="fixed top-16 right-4 z-50">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
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
                  <h2 className="text-2xl font-bold text-white mb-2">🌟 My Learning</h2>
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
                <ChatWindow />
              </div>
            </div>
          )}

          {/* Mobile Main Content */}
          <main className="pt-20 px-4 pb-6">
            <div className="max-w-4xl mx-auto">
              <Routes>
                <Route path="/writing" element={<WritingListPage />} />
                <Route path="/writing/create" element={<CreateWriting />} />
                <Route path="/writing/:id" element={<WritingDetailPage />} />
              </Routes>
            </div>
          </main>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex">
          {/* Desktop Sidebar */}
          <aside className="w-80 bg-white border-r border-purple-200 shadow-lg">
            <div className="p-6 bg-gradient-to-r from-purple-400 to-pink-400">
              <h2 className="text-2xl font-bold text-white mb-2">🌟 My Learning</h2>
              <p className="text-purple-100">Choose what to learn!</p>
            </div>
            <div className="p-4">
              <Sidebar items={menuData} />
            </div>
          </aside>

          {/* Desktop Main Content */}
          <main className="flex-1 p-8 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <Routes>
                <Route path="/writing" element={<WritingListPage />} />
                <Route path="/writing/create" element={<CreateWriting />} />
                <Route path="/writing/:id" element={<WritingDetailPage />} />
              </Routes>
            </div>
          </main>

          {/* Desktop Chat */}
          <aside className="w-96 border-l border-purple-200 bg-white shadow-lg">
            <ChatWindow />
          </aside>
        </div>
      </div>
    </Router>
  );
}

export default App;
