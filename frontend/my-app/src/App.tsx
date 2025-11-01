import { Routes, Route, Link } from "react-router-dom";

// pages
import Home from "@/pages/home";
import CreatePromiseMain from "@/pages/create-promise-main";
import MyPage from "@/pages/my-page";

// components
import BottomNav from "@/components/layout/bottom-nav";

export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreatePromiseMain />} />
        <Route path="/me" element={<MyPage />} />
      </Routes>

      <BottomNav />
    </div>
  );
}
