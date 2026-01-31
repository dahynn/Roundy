import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import VerificationPage from '@/pages/VerificationPage';
import WaitingLobby from './pages/meeting/WaitingLobby';
import MessageListPage from './pages/message/MessageListPage';
import ChatRoomPage from './pages/message/ChatRoomPage';
import MyPage from './pages/MyPage'; // ★ 마이페이지 임포트 추가
import Onboarding from "@/pages/auth/Onboarding.tsx";
import RotationTestPage from './pages/meeting/RotationTest';

function AppLayout() {
  const location = useLocation();

  // Navbar를 숨길 경로 정의 (마이페이지는 숨기지 않음)
  const hideNavbarPaths = ['/', '/verify', '/loading'];
  const isOnboarding = location.pathname.startsWith('/onboarding');
  const shouldHideNavbar = hideNavbarPaths.includes(location.pathname) || isOnboarding;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFBFF]">
      {/* 1. 온보딩/랜딩/인증 등이 아닐 때만 Navbar 표시 */}
      {!shouldHideNavbar && <Navbar />}

      {/* 2. 메인 영역: 네브바 유무에 따라 좌측 여백(ml) 자동 조절 */}
      <main
        className={`flex-1 h-full ${shouldHideNavbar ? 'ml-0' : 'ml-64'} ${isOnboarding ? 'overflow-y-auto' : 'overflow-hidden'}`}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/messages" element={<MessageListPage />} />
          <Route path="/messages/:matchId" element={<ChatRoomPage />} />

          {/* ★ 마이페이지 경로 연결 확인 */}
          <Route path="/mypage" element={<MyPage />} />

          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/loading" element={<WaitingLobby />} />
          <Route path="/meeting" element={<RotationTestPage />} />
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
