import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage'; // 새로 만든 랜딩 페이지
import HomePage from './pages/HomePage'; // 기존 로그인 후 홈
import VerificationPage from './pages/VerificationPage';
import WaitingLobby from './pages/meeting/WaitingLobby';

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. 이제 서비스에 접속하면 가장 먼저 랜딩 페이지가 뜹니다 */}
        <Route path="/" element={<LandingPage />} />

        {/* 2. 로그인 이후의 화면들은 주소를 조금씩 옮겨줍니다 */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/loading" element={<WaitingLobby />} />
      </Routes>
    </Router>
  );
}

export default App;
