import { useLayoutEffect, useRef } from 'react';

// A textarea that auto-grows to its content height, following while typing,
// and adds one line of spacing on top of the content height.
export function AutoTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    const line = parseFloat(getComputedStyle(el).lineHeight) || 0;
    el.style.height = `${el.scrollHeight + line}px`;
  }

  useLayoutEffect(() => {
    if (ref.current) resize(ref.current);
  }, [props.value]);

  return (
    <textarea {...props} ref={ref} onInput={e => resize(e.currentTarget)} />
  );
}
