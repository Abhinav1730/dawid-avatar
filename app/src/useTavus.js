import { useCallback, useEffect, useRef, useState } from 'react';
import { appendUtterance } from './conversation.mjs';

async function api(route, options) {
  const response = await fetch(`/api/${route}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'The conversation could not be started.');
  return data;
}

export function useTavus() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [remote, setRemote] = useState(null);
  const [micMuted, setMicMuted] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const call = useRef(null);
  const session = useRef(null);
  const busy = useRef(false);
  const paused = useRef(false);
  const restoreMic = useRef(false);
  const cancel = useRef(0);
  const joinTimer = useRef(null);

  const end = useCallback(async () => {
    cancel.current += 1;
    clearTimeout(joinTimer.current);
    const instance = call.current;
    const current = session.current;
    call.current = null;
    session.current = null;
    paused.current = false;
    setStatus('idle'); setRemote(null); setSpeaking(false); setMicMuted(true);
    try { await instance?.destroy(); } catch { /* Already ended rooms can be destroyed safely. */ }
    if (current) {
      try { await api(`conversations/${encodeURIComponent(current.conversationId)}/end`, { method: 'POST', body: '{}' }); }
      catch { setError('You have left the call. Server cleanup could not be confirmed; the room will close automatically.'); }
    }
  }, []);

  const start = useCallback(async (textOnly = false) => {
    if (busy.current || call.current) return;
    busy.current = true;
    const generation = ++cancel.current;
    setStatus('connecting'); setError(''); setMessages([]);
    try {
      const readiness = await api('status');
      if (!readiness.ready) throw new Error('Dawid’s live avatar and voice are still being prepared. You can try a reflection practice now.');
      if (!textOnly) {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access needs a secure browser connection. You can connect using text instead.');
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        probe.getTracks().forEach(track => track.stop());
      }
      if (generation !== cancel.current) return;
      const current = await api('conversations', { method: 'POST', body: '{}' });
      if (generation !== cancel.current) {
        await api(`conversations/${encodeURIComponent(current.conversationId)}/end`, { method: 'POST', body: '{}' });
        return;
      }
      session.current = current;
      const { default: Daily } = await import('@daily-co/daily-js');
      if (generation !== cancel.current) return;
      const instance = Daily.createCallObject({ videoSource: false });
      call.current = instance;
      const sync = () => {
        if (call.current !== instance) return;
        const participant = Object.values(instance.participants()).find(item => !item.local);
        if (!participant) { setRemote(null); return; }
        const video = participant.tracks?.video?.persistentTrack;
        const audio = participant.tracks?.audio?.persistentTrack;
        // Portrait mode uses Tavus audio while preserving the supplied Dawid image.
        // The provider's temporary stock face is never shown to the user.
        setRemote({ video: current.presentation === 'portrait' ? undefined : video, audio });
        if (video?.readyState === 'live' || audio?.readyState === 'live') {
          clearTimeout(joinTimer.current);
          if (!paused.current) setStatus('connected');
        }
      };
      for (const event of ['participant-joined', 'participant-updated', 'participant-left', 'track-started', 'track-stopped']) instance.on(event, sync);
      instance.on('app-message', ({ data }) => {
        if (call.current !== instance || data?.conversation_id && data.conversation_id !== current.conversationId) return;
        if (data?.event_type === 'conversation.utterance') setMessages(previous => appendUtterance(previous, data));
        if (['pal', 'replica'].includes(data?.properties?.role)) {
          if (data.event_type === 'conversation.started_speaking') setSpeaking(true);
          if (data.event_type === 'conversation.stopped_speaking') setSpeaking(false);
        }
      });
      instance.on('error', () => { if (call.current === instance) { void end(); setError('The live connection was interrupted. Please reconnect.'); } });
      instance.on('left-meeting', () => { if (call.current === instance) { void end(); setError('The conversation has ended.'); } });
      instance.on('camera-error', () => setError('Your microphone is unavailable. You can continue using text.'));
      joinTimer.current = setTimeout(() => { if (call.current === instance) { void end(); setError('Dawid did not join in time. Please try again.'); } }, 40_000);
      await instance.join({ url: current.url, token: current.token, userName: 'You', startVideoOff: true, startAudioOff: textOnly });
      if (call.current !== instance) return;
      setMicMuted(textOnly);
      sync();
    } catch (reason) {
      if (generation !== cancel.current) return;
      await end();
      setError(reason.name === 'NotAllowedError' ? 'Microphone permission was declined. Use “Connect with text” to continue without it.' : reason.message || 'The connection could not be started.');
    } finally { busy.current = false; }
  }, [end]);

  const send = useCallback(text => {
    if (!call.current || !session.current || paused.current || status !== 'connected') return false;
    const trimmed = text.trim().slice(0, 4000);
    if (!trimmed) return false;
    try {
      call.current.sendAppMessage({ message_type: 'conversation', event_type: 'conversation.respond', conversation_id: session.current.conversationId, properties: { text: trimmed } }, '*');
      setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'user', text: trimmed, pending: true }].slice(-100));
      return true;
    } catch { setError('Your message could not be sent. Please try again.'); return false; }
  }, [status]);

  const toggleMic = useCallback(async () => {
    if (!call.current || paused.current) return;
    try { await call.current.setLocalAudio(micMuted); setMicMuted(!micMuted); }
    catch { setError('Your microphone could not be enabled. You can continue with text.'); }
  }, [micMuted]);

  const setPaused = useCallback(async value => {
    if (!call.current || !session.current || paused.current === value) return;
    const instance = call.current;
    paused.current = value;
    if (value) {
      restoreMic.current = !micMuted;
      try {
        call.current.sendAppMessage({ message_type: 'conversation', event_type: 'conversation.interrupt', conversation_id: session.current.conversationId }, '*');
        await call.current.setLocalAudio(false);
      } catch { if (call.current !== instance) return; await end(); setError('The connection was interrupted while pausing. Please reconnect.'); return; }
      if (call.current !== instance || paused.current !== value) return;
      setMicMuted(true); setSpeaking(false); setStatus('paused');
    } else {
      try { await call.current.setLocalAudio(restoreMic.current); }
      catch { if (call.current !== instance) return; await end(); setError('The connection could not resume. Please reconnect.'); return; }
      if (call.current !== instance || paused.current !== value) return;
      setMicMuted(!restoreMic.current); setStatus('connected');
    }
  }, [micMuted, end]);

  useEffect(() => {
    const pageLeave = () => {
      if (session.current) navigator.sendBeacon(`/api/conversations/${encodeURIComponent(session.current.conversationId)}/end`, new Blob(['{}'], { type: 'application/json' }));
    };
    window.addEventListener('pagehide', pageLeave);
    return () => { window.removeEventListener('pagehide', pageLeave); void end(); };
  }, [end]);
  return { status, error, clearError: () => setError(''), messages, remote, micMuted, speaking, start, end, send, toggleMic, setPaused };
}
