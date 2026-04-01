import { useEffect } from "react";

export function useDisableDoubleTapZoom() {
  useEffect(() => {
    let lastTouchEnd = 0;

    const handleTouchEnd = (event) => {
      const now = Date.now();
      const isQuickSecondTap = now - lastTouchEnd <= 300;

      if (isQuickSecondTap) {
        event.preventDefault();
      }

      lastTouchEnd = now;
    };

    const handleDoubleClick = (event) => {
      event.preventDefault();
    };

    document.addEventListener("touchend", handleTouchEnd, { passive: false });
    document.addEventListener("dblclick", handleDoubleClick);

    return () => {
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("dblclick", handleDoubleClick);
    };
  }, []);
}
