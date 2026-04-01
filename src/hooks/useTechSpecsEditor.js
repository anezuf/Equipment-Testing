import { useCallback, useRef, useState } from "react";

export function useTechSpecsEditor({ techSpecs, setTechSpecs, setShowApplyConfirm }) {
  const [techSpecsEditMode, setTechSpecsEditMode] = useState(false);
  const techSpecsSnapshot = useRef(null);

  const moveTechSection = useCallback((sectionIndex, direction) => {
    const nextIndex = sectionIndex + direction;
    if (nextIndex < 0 || nextIndex >= techSpecs.length) return;
    setTechSpecs((prev) => {
      const result = [...prev];
      [result[sectionIndex], result[nextIndex]] = [result[nextIndex], result[sectionIndex]];
      return result;
    });
  }, [setTechSpecs, techSpecs.length]);

  const moveTechItem = useCallback((sectionIndex, itemIndex, direction) => {
    const sectionItems = techSpecs[sectionIndex]?.items || [];
    const nextIndex = itemIndex + direction;
    if (nextIndex < 0 || nextIndex >= sectionItems.length) return;
    setTechSpecs((prev) => prev.map((section, idx) => {
      if (idx !== sectionIndex) return section;
      const items = [...section.items];
      [items[itemIndex], items[nextIndex]] = [items[nextIndex], items[itemIndex]];
      return { ...section, items };
    }));
  }, [setTechSpecs, techSpecs]);

  const applyTechSpecsToEditor = useCallback(() => {
    setShowApplyConfirm(false);
    setTechSpecsEditMode(false);
  }, [setShowApplyConfirm]);

  return {
    techSpecsEditMode,
    setTechSpecsEditMode,
    techSpecsSnapshot,
    moveTechSection,
    moveTechItem,
    applyTechSpecsToEditor,
  };
}
