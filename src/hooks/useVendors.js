import { useCallback, useMemo } from "react";
import { mkAll, mkOff } from "../sections";
import { calcTotal, calcSec } from "../scoring";
import { sanitizeProductionCapacityInput } from "../utils";

export function useVendors({ scoringData, setScoringData, sections, act, setAct }) {
  const vendors =
    scoringData?.vendors ??
    (() => {
      const n = mkAll(sections).length;
      return [
        {
          name: "Вендор 1",
          scores: Array(n).fill(null),
          notes: Array(n).fill(""),
          images: Array(n).fill(null),
          productionRating: null,
          productionVerdict: null,
          productionCapacity: "0",
        },
      ];
    })();

  const setVendors = useCallback(
    (nv) => setScoringData((p) => ({ ...p, vendors: typeof nv === "function" ? nv(p.vendors) : nv })),
    [setScoringData]
  );

  const ALL = useMemo(() => mkAll(sections), [sections]);
  const SEC_OFF = useMemo(() => mkOff(sections), [sections]);
  const itemCount = ALL.length;

  const addVendor = useCallback(() => {
    if (vendors.length >= 25) return;
    setVendors((p) => [
      ...p,
      {
        name: `Вендор ${p.length + 1}`,
        scores: Array(itemCount).fill(null),
        notes: Array(itemCount).fill(""),
        images: Array(itemCount).fill(null),
        productionRating: null,
        productionVerdict: null,
        productionCapacity: "0",
      },
    ]);
  }, [itemCount, setVendors, vendors.length]);

  const removeVendor = useCallback(
    (i) => {
      if (vendors.length <= 1) return;
      setVendors((p) => p.filter((_, j) => j !== i));
      if (act >= vendors.length - 1 && act > 0) setAct(act - 1);
    },
    [act, setAct, setVendors, vendors.length]
  );

  const renameVendor = useCallback(
    (i, nm) => {
      setVendors((p) => {
        const n = [...p];
        n[i] = { ...n[i], name: nm };
        return n;
      });
    },
    [setVendors]
  );

  const onScoreChange = useCallback(
    (idx, val) => {
      setVendors((p) => {
        const n = [...p];
        const v = { ...n[act], scores: [...n[act].scores] };
        v.scores[idx] = v.scores[idx] === val ? null : val;
        n[act] = v;
        return n;
      });
    },
    [act, setVendors]
  );

  const onNoteChange = useCallback(
    (idx, html) => {
      const clean = html.replace(/<br\s*\/?>/gi, "").replace(/<div><\/div>/gi, "").trim();
      const final = clean === "" ? "" : html;
      setVendors((p) => {
        const n = [...p];
        const v = { ...n[act], notes: [...n[act].notes] };
        v.notes[idx] = final;
        n[act] = v;
        return n;
      });
    },
    [act, setVendors]
  );

  const onImageAdd = useCallback(
    (idx, name, dataUrl, isFile = false, isImg = false, isVid = false) => {
      setVendors((p) => {
        const n = [...p];
        const v = { ...n[act], images: [...(n[act].images || [])] };
        const arr = v.images[idx] || [];
        v.images[idx] = [...arr, { name, data: dataUrl, isFile, isImg, isVid }];
        n[act] = v;
        return n;
      });
    },
    [act, setVendors]
  );

  const onImageRemove = useCallback(
    (idx, imgIdx) => {
      setVendors((p) => {
        const n = [...p];
        const v = { ...n[act], images: [...(n[act].images || [])] };
        const arr = [...(v.images[idx] || [])];
        arr.splice(imgIdx, 1);
        v.images[idx] = arr.length ? arr : null;
        n[act] = v;
        return n;
      });
    },
    [act, setVendors]
  );

  const onProductionRatingChange = useCallback(
    (rating) => {
      setVendors((p) => {
        const n = [...p];
        n[act] = { ...n[act], productionRating: rating };
        return n;
      });
    },
    [act, setVendors]
  );

  const onProductionCapacityChange = useCallback(
    (capacity) => {
      setVendors((p) => {
        const n = [...p];
        n[act] = { ...n[act], productionCapacity: sanitizeProductionCapacityInput(capacity) };
        return n;
      });
    },
    [act, setVendors]
  );

  const onProductionVerdictChange = useCallback(
    (verdict) => {
      setVendors((p) => {
        const n = [...p];
        n[act] = { ...n[act], productionVerdict: verdict };
        return n;
      });
    },
    [act, setVendors]
  );

  const totals = useMemo(() => vendors.map((v) => calcTotal(v.scores, ALL)), [vendors, ALL]);
  const allSec = useMemo(
    () => vendors.map((v) => sections.map((_, si) => calcSec(v.scores, si, sections, SEC_OFF))),
    [vendors, sections, SEC_OFF]
  );

  const sortedIdx = useMemo(() => {
    const arr = vendors.map((_, i) => i);
    arr.sort((a, b) => {
      const ta = totals[a];
      const tb = totals[b];
      if (ta == null && tb == null) return a - b;
      if (ta == null) return 1;
      if (tb == null) return -1;
      return tb - ta;
    });
    return arr;
  }, [vendors, totals]);

  const getAdvantages = useCallback(
    (sc) => ALL.flatMap((it, i) => (it.w === 0 && sc[i] != null && sc[i] > 0 ? [{ ...it, idx: i }] : [])),
    [ALL]
  );

  return {
    vendors,
    setVendors,
    ALL,
    SEC_OFF,
    itemCount,
    addVendor,
    removeVendor,
    renameVendor,
    onScoreChange,
    onNoteChange,
    onImageAdd,
    onImageRemove,
    onProductionRatingChange,
    onProductionCapacityChange,
    onProductionVerdictChange,
    totals,
    allSec,
    sortedIdx,
    getAdvantages,
  };
}
