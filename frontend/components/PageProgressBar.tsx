'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

const PageProgressBar = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  useEffect(() => {
    // This will run only once when the component mounts.
    // We are pushing the NProgress.start and NProgress.done to the window.history
    const handleHistoryChange = () => {
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;

      window.history.pushState = (...args) => {
        NProgress.start();
        originalPushState.apply(window.history, args);
      };
      
      window.history.replaceState = (...args) => {
        NProgress.start();
        originalReplaceState.apply(window.history, args);
      };

      // When the component unmounts, we need to restore the original functions
      return () => {
        window.history.pushState = originalPushState;
        window.history.replaceState = originalReplaceState;
      };
    };
    
    handleHistoryChange();

  }, []);


  return null; // This component doesn't render anything itself.
};

export default PageProgressBar;
