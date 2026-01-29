import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import VerificationPage from './pages/VerificationPage';
import WaitingLobby from './pages/meeting/WaitingLobby';
import OnboardingFirst from './pages/auth/OnboardingFirst';
import OnboardingSecond from './pages/auth/OnboardingSecond'; // 온보딩 2단계 추가
import OnboardingThird from './pages/auth/OnboardingThird'; // 3단계 임포트

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* 온보딩 플로우 */}
        <Route path="/onboarding" element={<OnboardingFirst />} />
        <Route path="/onboarding/second" element={<OnboardingSecond />} />
        <Route path="/onboarding/third" element={<OnboardingThird />} /> {/* 추가 */}
        {/* 서비스 화면 */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/loading" element={<WaitingLobby />} />
      </Routes>
    </Router>
  );
}

export default App;
