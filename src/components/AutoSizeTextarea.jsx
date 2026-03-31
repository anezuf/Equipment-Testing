import { useLayoutEffect, useRef, useCallback } from "react";

export default function AutoSizeTextarea({ value, onChange, onFocus, style, minHeight, ...rest }) {
  const ref = useRef(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useLayoutEffect(() => {
    resize();
  }, [value, resize]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        resize();
      }}
      onInput={resize}
      onFocus={(e) => {
        onFocus?.(e);
        resize();
      }}
      style={{ ...style, minHeight, overflow: "hidden", height: "auto" }}
      {...rest}
    />
  );
}
