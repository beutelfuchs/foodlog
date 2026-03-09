import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import LogPage from './pages/LogPage';
import StatsPage from './pages/StatsPage';
import ShareReceiver from './pages/ShareReceiver';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';

export interface ToastMessage {
  text: string;
  id: number;
}

const TAB_ORDER = ['/', '/stats'];
let toastId = 0;

export function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const isSharePage = location.pathname === '/share';

  function showToast(text: string) {
    const id = ++toastId;
    setToasts((prev) => [...prev, { text, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  }

  // Swipe navigation between tabs
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx)) return;

    const currentIdx = TAB_ORDER.indexOf(location.pathname);
    if (currentIdx === -1) return;

    if (dx < 0 && currentIdx < TAB_ORDER.length - 1) {
      navigate(TAB_ORDER[currentIdx + 1]);
    } else if (dx > 0 && currentIdx > 0) {
      navigate(TAB_ORDER[currentIdx - 1]);
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  // Handle shared images from Web Share Target
  const [sharedImage, setSharedImage] = useState<File | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SHARED_IMAGE' && event.data.file) {
          setSharedImage(event.data.file);
          navigate('/share');
        }
      });
    }
  }, [navigate]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden pb-14">
        <Routes>
          <Route path="/" element={<LogPage showToast={showToast} />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/share" element={<ShareReceiver sharedImage={sharedImage} setSharedImage={setSharedImage} showToast={showToast} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!isSharePage && <BottomNav />}
      <Toast toasts={toasts} />
    </div>
  );
}

export default App;
