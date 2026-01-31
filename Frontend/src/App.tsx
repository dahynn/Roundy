import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import VerificationPage from '@/pages/VerificationPage';
import WaitingLobby from './pages/meeting/WaitingLobby';
import MessageListPage from './pages/message/MessageListPage';
import ChatRoomPage from './pages/message/ChatRoomPage';
import MyPage from './pages/MyPage';
import Onboarding from '@/pages/auth/Onboarding.tsx';
import RotationTestPage from './pages/meeting/RotationTest';
import AuthCallback from './pages/auth/AuthCallback'; // 콜백 페이지 임포트

function AppLayout() {
  const location = useLocation();

  // 1. Navbar를 숨길 경로 정의
  // 랜딩(/), 인증(/verify), 로딩(/loading) 및 카카오 콜백(/auth/callback)에서 숨김 처리
  const hideNavbarPaths = ['/', '/verify', '/loading', '/auth/callback'];
  const isOnboarding = location.pathname.startsWith('/onboarding');

  // 위 경로에 해당하거나 온보딩 과정 중이면 Navbar를 숨깁니다.
  const shouldHideNavbar = hideNavbarPaths.includes(location.pathname) || isOnboarding;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFBFF]">
      {/* 1. 조건에 따라 Navbar 표시 여부 결정 */}
      {!shouldHideNavbar && <Navbar />}

      {/* 2. 메인 영역 설정 */}
      <main
        className={`flex-1 h-full ${
          shouldHideNavbar ? 'ml-0' : 'ml-64'
        } ${isOnboarding ? 'overflow-y-auto' : 'overflow-hidden'}`}
      >
        <Routes>
          {/* 랜딩 및 인증 콜백 */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} /> {/* 토큰 수신 경로 */}
          {/* 온보딩 및 서비스 단계 */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/messages" element={<MessageListPage />} />
          <Route path="/messages/:matchId" element={<ChatRoomPage />} />
          <Route path="/mypage" element={<MyPage />} />
          {/* 특수 목적 페이지 */}
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
