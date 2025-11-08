/**
 * Hook to handle Parent Portal access with PIN check
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useParentPinStatus } from "@api/queries/useParentPinStatus";

export function useParentPortalAccess() {
  const navigate = useNavigate();
  const { data: pinStatus } = useParentPinStatus();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const navigateToParentPortal = useCallback(
    (path: string = "/parent-portal") => {
      if (pinStatus?.has_pin) {
        // PIN is set, show modal
        setPendingNavigation(path);
        setShowPinModal(true);
      } else {
        // No PIN, navigate directly
        navigate(path);
      }
    },
    [pinStatus, navigate]
  );

  const handlePinSuccess = useCallback(() => {
    setShowPinModal(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, navigate]);

  const handlePinCancel = useCallback(() => {
    setShowPinModal(false);
    setPendingNavigation(null);
  }, []);

  return {
    navigateToParentPortal,
    showPinModal,
    handlePinSuccess,
    handlePinCancel,
  };
}
