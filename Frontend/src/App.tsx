import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import VerificationPage from '@/pages/VerificationPage';
import WaitingLobby from './pages/meeting/WaitingLobby';
import MessageListPage from './pages/message/MessageListPage';
import ChatRoomPage from './pages/message/ChatRoomPage';
import Onboarding from "@/pages/auth/Onboarding.tsx";

function AppLayout() {
  const location = useLocation();

  // Navbar를 숨길 경로 정의
  const hideNavbarPaths = ['/', '/verify', '/loading'];
  const isOnboarding = location.pathname.startsWith('/onboarding');
  const shouldHideNavbar = hideNavbarPaths.includes(location.pathname) || isOnboarding;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFBFF]">
      {/* 1. 온보딩/랜딩이 아닐 때만 Navbar 표시 */}
      {!shouldHideNavbar && <Navbar />}

      {/* 2. 메인 영역: 온보딩 페이지라면 스크롤 허용(overflow-y-auto) */}
      <main
        className={`flex-1 h-full ${shouldHideNavbar ? 'ml-0' : 'ml-64'} ${isOnboarding ? 'overflow-y-auto' : 'overflow-hidden'}`}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/messages" element={<MessageListPage />} />
          <Route path="/messages/:matchId" element={<ChatRoomPage />} />
          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/loading" element={<WaitingLobby />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
