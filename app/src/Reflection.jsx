import { useEffect, useState } from 'react';
import { ArrowRight, Check, ListChecks } from '@phosphor-icons/react';
import { Modal } from './Modal';

export function Reflection({ onClose, onSave, returnLabel = 'Back to conversation' }) {
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState(60);
  const [action, setAction] = useState('');
  const [saved, setSaved] = useState(false);
  const [showAction, setShowAction] = useState(false);
  useEffect(() => {
    if (!started || remaining === 0) return;
    const deadline = Date.now() + remaining * 1000;
    const interval = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) clearInterval(interval);
    }, 250);
    return () => clearInterval(interval);
    // A single wall-clock deadline avoids drift when a browser tab is inactive.
  }, [started]);
  const save = () => { if (action.trim() && onSave(action.trim())) setSaved(true); };
  return <Modal title="Take a quiet moment" onClose={onClose} className="reflection-modal">
    <p>Feel your feet on the ground. Let your breath settle.</p>
    {(started || remaining < 60) && <div className="practice-progress" role="status"><span>{remaining > 0 ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : 'Take this feeling with you.'}</span><progress max="60" value={60 - remaining} aria-label="Reflection progress" /></div>}
    <button className="button button-dark full-width" onClick={() => { setStarted(!started); }} disabled={remaining === 0}>{remaining === 0 ? 'Reflection complete' : started ? 'Pause reflection' : remaining < 60 ? 'Continue reflection' : 'Begin reflection'}<ArrowRight size={22} /></button>
    <button className="text-button full-width" onClick={onClose}>{returnLabel}</button>
    <div className="action-area">
      <button className="action-toggle" onClick={() => setShowAction(!showAction)} aria-expanded={showAction}><ListChecks size={24} />Save a small action<ArrowRight size={19} /></button>
      {showAction && <div className="action-form"><label htmlFor="small-action">One kind thing you can do today</label><input id="small-action" maxLength={240} value={action} onChange={event => { setAction(event.target.value); setSaved(false); }} placeholder="Call someone who matters to me" /><button className="button button-lime" onClick={save} disabled={!action.trim() || saved}>{saved ? <><Check size={18} /> Saved on this device</> : 'Save action'}</button></div>}
    </div>
  </Modal>;
}
