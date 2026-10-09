import { useLayoutEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';

export function Modal({ title, onClose, children, className = '' }) {
  const dialog = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    const node = dialog.current;
    const previousFocus = document.activeElement;
    node.showModal();
    const cancel = event => { event.preventDefault(); close.current(); };
    node.addEventListener('cancel', cancel);
    return () => { node.removeEventListener('cancel', cancel); if (node.open) node.close(); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);
  return <dialog ref={dialog} className={`modal ${className}`} aria-labelledby="modal-title" onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <button className="icon-button modal-close" onClick={onClose} aria-label="Close window"><X size={23} /></button>
    <h2 id="modal-title">{title}</h2>
    {children}
  </dialog>;
}
