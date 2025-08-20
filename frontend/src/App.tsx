import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import Header from "./components/Header";
import { Sidebar, MenuItem } from "./components/Sidebar";
// import Writing from "./components/Writing";
import ChatWindow from "./components/chat/ChatWindow";
import WritingListPage from "./components/writing/WritingListPage";
import WritingDetailPage from "./components/writing/WritingDetailPage";
import CreateWriting from "./components/writing/CreateWriting";

function App() {
  const menuData: MenuItem[] = [
    {
      label: "Language",
      children: [
        {
          label: "English",
          children: [
            {
              label: "Writing",
              path: "/writing",
            },
          ],
        },
      ],
    },
    {
      label: "Math",
    },
  ];
  return (
    <Router>
      <Header />
      <div className="flex min-h-screen">
        <aside className="w-64 bg-gray-100 p-4 border-r">
          <h2 className="text-xl font-bold mb-4">Menu</h2>
          <Sidebar items={menuData} />
        </aside>
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/writing" element={<WritingListPage />} />
            <Route path="/writing/create" element={<CreateWriting />} />
            <Route path="/writing/:id" element={<WritingDetailPage />} />
          </Routes>
        </main>
        <aside className="w-2xl border-l">
          <ChatWindow />
        </aside>
      </div>
    </Router>
  );
}

export default App;
