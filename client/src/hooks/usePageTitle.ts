// client/src/hooks/usePageTitle.ts
import { useEffect } from "react";

export function usePageTitle(title: string, includeAppName: boolean = true) {
  useEffect(() => {
    const appName = "AI Lead System";
    
    if (includeAppName) {
      document.title = `${title} | ${appName}`;
    } else {
      document.title = title;
    }

    // Cleanup: Reset to default when component unmounts
    return () => {
      document.title = appName;
    };
  }, [title, includeAppName]);
}