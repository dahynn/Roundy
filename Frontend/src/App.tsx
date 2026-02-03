import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import LandingPage from '@/pages/LandingPage';
import HomePage from '@/pages/HomePage';
import MessageListPage from '@/pages/message/MessageListPage';
import ChatRoomPage from '@/pages/message/ChatRoomPage';
import MyPage from '@/pages/my/MyPage';
import PreferenceEditPage from '@/pages/my/PreferenceEditPage';
import NoticePage from '@/pages/my/NoticePage';
import FAQPage from '@/pages/my/FAQPage';
import VerificationPage from '@/pages/verification/VerificationPage';
import WaitingLobby from '@/pages/meeting/WaitingLobby';
import RotationTestPage from '@/pages/meeting/RotationTest'
import RotationMeeting from '@/pages/meeting/RotationMeeting'
import Onboarding from '@/pages/auth/Onboarding';
import AuthCallback from '@/pages/auth/AuthCallback';
import { useTheme } from '@/components/theme-provider';
import { UserProvider } from '@/context/UserContext';

function App() {
  const { theme } = useTheme();

  return (
    <Router>
      <UserProvider>
        <div
          className={`min-h-screen w-full font-['Pretendard'] transition-colors duration-300 relative overflow-x-hidden ${theme === 'dark' ? 'text-white' : 'text-[#1A1F36]'
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

          {/* 2. 기존 /meeting 경로를 새 컴포넌트로 업데이트 */}
          <Route path="/meeting" element={<RotationMeeting />} />

          {/* ─── 3. Navbar가 있는 페이지들 (Layout 사용) ─── */}
            <Route element={<Layout />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/messages" element={<MessageListPage />} />
              <Route path="/messages/:matchId" element={<ChatRoomPage />} />
              <Route path="/mypage" element={<MyPage />} />
              <Route path="/mypage/preferences" element={<PreferenceEditPage />} />
              <Route path="/notices" element={<NoticePage />} />
              <Route path="/faq" element={<FAQPage />} />
            </Route>
          </Routes>
        </div>
      </UserProvider>
    </Router>
  );
}

export default App;