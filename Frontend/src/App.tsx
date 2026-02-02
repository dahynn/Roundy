import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import MessageListPage from './pages/message/MessageListPage';
import ChatRoomPage from './pages/message/ChatRoomPage';
import MyPage from './pages/MyPage';
import VerificationPage from '@/pages/VerificationPage';
import WaitingLobby from './pages/meeting/WaitingLobby';
import RotationTestPage from './pages/meeting/RotationTest';
import Onboarding from '@/pages/auth/Onboarding.tsx';
import AuthCallback from './pages/auth/AuthCallback';
import { useTheme } from '@/components/theme-provider';

function App() {
  const { theme } = useTheme();

  return (
    <Router>
      <div
        className={`min-h-screen w-full font-['Pretendard'] transition-colors duration-300 ${
          theme === 'dark' ? 'text-white' : 'text-[#1A1F36]'
        }`}
        style={{
          backgroundColor: theme === 'dark' ? '#0F1117' : '#F8F9FD',
          backgroundImage: theme === 'dark' 
            ? `
              radial-gradient(circle at 0% 0%, rgba(255, 77, 148, 0.1), transparent 50%), 
              radial-gradient(circle at 100% 100%, rgba(124, 58, 237, 0.1), transparent 50%)
            `
            : `
              radial-gradient(circle at 0% 0%, rgba(255, 77, 148, 0.15), transparent 50%), 
              radial-gradient(circle at 100% 100%, rgba(124, 58, 237, 0.15), transparent 50%)
            `
        }}
      >
        <Routes>
          {/* ─── 1. Navbar가 없는 페이지들 ─── */}
          {/* 이제 배경색은 자동으로 적용됩니다! */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/loading" element={<WaitingLobby />} />
          <Route path="/meeting" element={<RotationTestPage />} />

          {/* ─── 2. Navbar가 있는 페이지들 ─── */}
          {/* Layout은 이제 Navbar 위치만 잡아줍니다 */}
          <Route element={<Layout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/messages" element={<MessageListPage />} />
            <Route path="/messages/:matchId" element={<ChatRoomPage />} />
            <Route path="/mypage" element={<MyPage />} />
          </Route>

        </Routes>
      </div>
    </Router>
  );
}

export default App;