import './App.css';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function App() {
  return (
    // 1. 전체 화면을 꽉 채우고(h-screen) 아이템을 중앙 정렬(flex justify-center items-center)
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-6">
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      {/* 2. 폰트 크기(text-5xl), 굵기(font-bold), 그리고 텍스트에 그라데이션 넣기 */}
      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
        Tailwind 연동 성공! 🎉
      </h1>

      <p className="text-slate-600 text-lg">마우스를 버튼에 올려보세요 (Hover & Scale 효과)</p>

      {/* 3. 버튼 스타일링: 그림자(shadow), 둥근 모서리(rounded), 호버/클릭 효과(hover, active) */}
      <button className="px-8 py-4 text-xl font-bold text-white transition-all transform bg-pink-500 rounded-2xl shadow-lg hover:bg-pink-600 hover:shadow-xl hover:-translate-y-1 active:scale-95">
        Roundy 시작하기 🚀
      </button>
    </div>
  );
}

export default App;
