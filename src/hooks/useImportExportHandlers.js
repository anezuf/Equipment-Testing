import { useCallback } from "react";
import { exportTechSpecsXlsx } from "../utils/exportTechSpecs";
import { exportVendorForm } from "../utils/exportVendorForm";
import { exportScoringExcel } from "../utils/exportScoringExcel";
import { importScoringFile } from "../utils/importScoringFile";
import { importTechSpecsFile } from "../utils/importTechSpecsFile";

export function useImportExportHandlers({
  sections,
  vendors,
  itemCount,
  setVendors,
  setAct,
  setView,
  techSpecs,
  techSpecsEqType,
  setTechSpecs,
  scoringEqType,
  ALL,
  act,
}) {
  const exportExcelFile = useCallback(async () => {
    await exportScoringExcel({ sections, vendors });
  }, [sections, vendors]);

  const importFile = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.xlsx,.xls";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await importScoringFile({
        file,
        sections,
        vendorsLength: vendors.length,
        itemCount,
        setVendors,
        setAct,
        setView,
      });
    };
    input.click();
  }, [itemCount, sections, setAct, setVendors, setView, vendors.length]);

  const exportTechSpecs = useCallback(async () => {
    await exportTechSpecsXlsx({ techSpecs, eqType: techSpecsEqType });
  }, [techSpecs, techSpecsEqType]);

  const importTechSpecs = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.xlsx,.xls";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await importTechSpecsFile({ file, setTechSpecs });
    };
    input.click();
  }, [setTechSpecs]);

  const exportActiveVendorForm = useCallback(() => {
    const vendor = vendors[act];
    if (!vendor) return;
    exportVendorForm({ vendor, sections, eqType: scoringEqType, ALL });
  }, [vendors, act, sections, scoringEqType, ALL]);

  return {
    exportExcelFile,
    importFile,
    exportTechSpecs,
    importTechSpecs,
    exportActiveVendorForm,
  };
}
