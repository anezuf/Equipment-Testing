import { useCallback } from "react";
import { downloadJsonFile, sanitizeEditorWeightsMap } from "../utils";
import { normalizeTechSpecs, TECH_SPECS_DEFAULT, PDU_TECH_SPECS_DEFAULT } from "../data/techSpecs";

export function useBackupRestore({
  EQ_TYPES,
  normalizeScoringData,
  scoringDataByType,
  editorWeightsByType,
  techSpecsByType,
  scoringEqType,
  setScoringDataByType,
  setEditorWeightsByType,
  setTechSpecsByType,
  setScoringEqType,
  getEditorWeightsKey,
}) {
  const handleBackupSession = useCallback(() => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const normalizedScoringByType = EQ_TYPES.reduce((acc, type) => {
        acc[type] = normalizeScoringData(type, scoringDataByType[type]);
        return acc;
      }, {});
      downloadJsonFile(`rack-audit-backup-${date}.json`, {
        scoringDataByType: normalizedScoringByType,
        editorWeightsByType,
        techSpecsByType,
        scoringEqType,
      });
    } catch (error) {
      alert(error?.message || String(error));
    }
  }, [EQ_TYPES, editorWeightsByType, normalizeScoringData, scoringDataByType, scoringEqType, techSpecsByType]);

  const handleRestoreBackupFileChange = useCallback(async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || parsed.scoringDataByType == null || typeof parsed.scoringDataByType !== "object") {
        alert("Неверный файл резервной копии: отсутствует или поврежден ключ scoringDataByType.");
        return;
      }

      const byType = parsed.scoringDataByType;
      setScoringDataByType({
        стойка: normalizeScoringData("стойка", byType["стойка"]),
        pdu: normalizeScoringData("pdu", byType.pdu),
      });

      if (parsed.editorWeightsByType && typeof parsed.editorWeightsByType === "object") {
        const nextEditorWeights = {
          стойка: sanitizeEditorWeightsMap(parsed.editorWeightsByType["стойка"]),
          pdu: sanitizeEditorWeightsMap(parsed.editorWeightsByType.pdu),
        };
        setEditorWeightsByType(nextEditorWeights);
        EQ_TYPES.forEach((type) => {
          try {
            localStorage.setItem(getEditorWeightsKey(type), JSON.stringify(nextEditorWeights[type]));
          } catch {
            // ignored
          }
        });
      }

      if (parsed.techSpecsByType && typeof parsed.techSpecsByType === "object") {
        setTechSpecsByType({
          стойка: normalizeTechSpecs(parsed.techSpecsByType["стойка"] ?? TECH_SPECS_DEFAULT),
          pdu: normalizeTechSpecs(parsed.techSpecsByType.pdu ?? PDU_TECH_SPECS_DEFAULT),
        });
      }

      if (parsed.scoringEqType === "pdu" || parsed.scoringEqType === "стойка") {
        setScoringEqType(parsed.scoringEqType);
      }
    } catch (error) {
      alert(error?.message || "Не удалось загрузить резервную копию.");
    }
  }, [
    EQ_TYPES,
    getEditorWeightsKey,
    normalizeScoringData,
    setEditorWeightsByType,
    setScoringDataByType,
    setScoringEqType,
    setTechSpecsByType,
  ]);

  return {
    handleBackupSession,
    handleRestoreBackupFileChange,
  };
}
