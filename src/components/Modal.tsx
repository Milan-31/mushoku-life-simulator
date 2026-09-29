import { useEffect } from "react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  /** 宽版：留给关系网这类需要铺开的画面 */
  wide?: boolean;
}

export default function Modal({ title, children, onClose, actions, wide }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`modal__box${wide ? " modal__box--wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{title}</h2>
        <div>{children}</div>
        {actions && <div className="modal__actions">{actions}</div>}
      </div>
    </div>
  );
}