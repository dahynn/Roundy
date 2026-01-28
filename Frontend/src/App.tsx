import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import VerificationPage from './pages/VerificationPage';
import WaitingLobby from './pages/meeting/WaitingLobby';
import OnboardingFirst from './pages/auth/OnboardingFirst'; // 온보딩 페이지 임포트

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. 서비스 접속 시 가장 먼저 보이는 랜딩 페이지 */}
        <Route path="/" element={<LandingPage />} />

        {/* 2. 온보딩 플로우: 회원가입 후 최초 1회 정보 수집 */}
        <Route path="/onboarding" element={<OnboardingFirst />} />

        {/* 3. 메인 서비스 화면들 */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/loading" element={<WaitingLobby />} />
      </Routes>
    </Router>
  );
}

export default App;
