import { useEffect } from 'react';
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  RefObject,
  SetStateAction,
} from 'react';

export function usePopoverMenu<T extends HTMLElement>({
  open,
  setOpen,
  containerRef,
  triggerRef,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  containerRef: RefObject<T | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [open]);

  function closeAndFocusTrigger(action?: () => void) {
    setOpen(false);
    action?.();
    triggerRef.current?.focus();
  }

  function closeOnEscape(event: ReactKeyboardEvent<T>) {
    if (event.key === 'Escape') closeAndFocusTrigger();
  }

  return { closeAndFocusTrigger, closeOnEscape };
}
