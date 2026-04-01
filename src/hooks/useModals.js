import { useCallback, useEffect, useState } from "react";

export function useModals() {
  const [notePopup, setNotePopup] = useState(null);
  const [infoPopup, setInfoPopup] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);

  useEffect(() => {
    if (infoPopup === null) return;
    const close = () => setInfoPopup(null);
    window.addEventListener("click", close, { once: true });
    return () => window.removeEventListener("click", close);
  }, [infoPopup]);

  const closeNotePopup = useCallback(() => setNotePopup(null), []);
  const closeResetModal = useCallback(() => setShowReset(false), []);
  const closeApplyConfirmModal = useCallback(() => setShowApplyConfirm(false), []);
  const stopModalPropagation = useCallback((event) => event.stopPropagation(), []);
  const showResetModal = useCallback(() => setShowReset(true), []);

  return {
    notePopup,
    setNotePopup,
    infoPopup,
    setInfoPopup,
    showReset,
    setShowReset,
    showApplyConfirm,
    setShowApplyConfirm,
    closeNotePopup,
    closeResetModal,
    closeApplyConfirmModal,
    stopModalPropagation,
    showResetModal,
  };
}
