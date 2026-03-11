import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
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

// Global overlay close callback — set by LogPage when catalogue/edit is open
(window as any).__closeOverlay = null as (() => boolean) | null;

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
    // LogPage handles its own swipe navigation (day browsing + Stats)
    if (location.pathname === '/') return;

    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx)) return;

    const currentIdx = TAB_ORDER.indexOf(location.pathname);
    if (currentIdx === -1) return;

    if (dx < 0 && currentIdx < TAB_ORDER.length - 1) {
      navigate(TAB_ORDER[currentIdx + 1], { replace: true });
    } else if (dx > 0 && currentIdx > 0) {
      navigate(TAB_ORDER[currentIdx - 1], { replace: true });
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

  // Handle Android back button — close overlays before exiting
  useEffect(() => {
    const listener = CapApp.addListener('backButton', () => {
      const closeOverlay = (window as any).__closeOverlay;
      if (closeOverlay && closeOverlay()) {
        // overlay was closed
        return;
      }
      // No overlay open — let the app handle it normally
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
      } else {
        CapApp.exitApp();
      }
    });
    return () => { listener.then(h => h.remove()); };
  }, [location.pathname, navigate]);

  // Handle shared images
  const [sharedImage, setSharedImage] = useState<File | null>(null);

  useEffect(() => {
    // Capacitor (Android): receive shared images via MainActivity bridge
    if (Capacitor.isNativePlatform()) {
      async function loadSharedImage(filePath: string) {
        try {
          // Read the file from Android's cache dir via Capacitor's file serving
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          const result = await Filesystem.readFile({ path: filePath });
          // result.data is base64
          const base64 = result.data as string;
          const bytes = atob(base64);
          const arr = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
          const file = new File([new Blob([arr], { type: 'image/jpeg' })], 'shared-image.jpg', { type: 'image/jpeg' });
          setSharedImage(file);
          navigate('/share');
        } catch (e) {
          console.error('Failed to load shared image:', e);
        }
      }

      // Register callback for when native side injects
      (window as any).__handleSharedImage = (path: string) => {
        loadSharedImage(path);
      };

      // Check if native side already set a pending path (cold start)
      const pending = (window as any).__pendingSharePath;
      if (pending) {
        (window as any).__pendingSharePath = null;
        loadSharedImage(pending);
      }

      return () => { (window as any).__handleSharedImage = null; };
    }

    // PWA: listen for service worker messages
    if ('serviceWorker' in navigator) {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'SHARED_IMAGE' && event.data.file) {
          setSharedImage(event.data.file);
          navigate('/share');
        }
      };
      navigator.serviceWorker.addEventListener('message', handler);
      return () => navigator.serviceWorker.removeEventListener('message', handler);
    }
  }, [navigate]);

  return (
    <div className="flex flex-col h-full pt-[env(safe-area-inset-top)]">
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
