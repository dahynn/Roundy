import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="w-full flex min-h-screen">
      
      {/* 내브바 (Fixed) */}
      <Navbar />

      {/* 메인 컨텐츠 영역 (내브바 너비만큼 밀어줌) */}
      <main className="flex-1 pl-64 w-full min-h-screen">
        <Outlet /> 
      </main>
      
    </div>
  );
}