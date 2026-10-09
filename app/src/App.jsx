import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookmarkSimple, ChatCircle, Check, CircleNotch, GearSix, Heart, House, Keyboard, Leaf, Microphone, MicrophoneSlash, Pause, Play, SpeakerHigh, SpeakerSlash, Stop, Trash, UserCircle, X } from '@phosphor-icons/react';
import { useTavus } from './useTavus';
import { Reflection } from './Reflection';
import { Modal } from './Modal';
import { Landing } from './Landing';

const routes = ['home', 'conversation', 'practices', 'profile', 'settings'];
const getRoute = () => routes.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
const navItems = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'conversation', label: 'Chat', icon: ChatCircle },
  { id: 'practices', label: 'Practices', icon: Leaf },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];
function getActions() {
  try { const value = JSON.parse(localStorage.getItem('dawid-actions') || '[]'); return Array.isArray(value) ? value.filter(item => typeof item?.id === 'string' && typeof item?.text === 'string').slice(0, 50) : []; }
  catch { return []; }
}
function Sidebar({ route, navigate }) {
  return <aside className="sidebar" aria-label="Main navigation">
    <button className="sidebar-mark" aria-label="Dawid home" onClick={() => navigate('home')}><span /></button>
    <nav>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${route === id ? 'active' : ''}`} aria-current={route === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={24} weight={route === id ? 'fill' : 'regular'} /><span>{label}</span></button>)}</nav>
    <button className={`nav-item settings-link ${route === 'settings' ? 'active' : ''}`} aria-current={route === 'settings' ? 'page' : undefined} onClick={() => navigate('settings')}><GearSix size={24} /><span>Settings</span></button>
  </aside>;
}
function AvatarMedia({ remote, muted, onPlaybackError }) {
  const video = useRef(null);
  const audio = useRef(null);
  useEffect(() => {
    const node = video.current;
    node.srcObject = remote?.video ? new MediaStream([remote.video]) : null;
    if (remote?.video) node.play().catch(onPlaybackError);
    return () => { node.srcObject = null; };
  }, [remote?.video, onPlaybackError]);
  useEffect(() => {
    const node = audio.current;
    node.srcObject = remote?.audio ? new MediaStream([remote.audio]) : null;
    if (remote?.audio) node.play().catch(onPlaybackError);
    return () => { node.srcObject = null; };
  }, [remote?.audio, onPlaybackError]);
  return <><video ref={video} autoPlay muted playsInline className={remote?.video ? 'avatar-video visible' : 'avatar-video'} aria-label="Dawid’s live AI avatar" /><audio ref={audio} autoPlay muted={muted} /></>;
}
function Conversation({ tavus, onReflection, onSetup, ready, compact, captions, presentation, initialPrompt }) {
  const [draft, setDraft] = useState(initialPrompt || '');
  const [soundMuted, setSoundMuted] = useState(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const input = useRef(null);
  const transcript = useRef(null);
  const connected = ['connected', 'paused'].includes(tavus.status);
  const paused = tavus.status === 'paused';
  const portraitMode = presentation === 'portrait';
  const connecting = tavus.status === 'connecting';
  const lastAssistant = [...tavus.messages].reverse().find(message => message.role === 'assistant');
  const onPlaybackError = useCallback(() => setPlaybackBlocked(true), []);
  useEffect(() => { transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: 'smooth' }); }, [tavus.messages]);
  const connect = textOnly => { if (ready) void tavus.start(textOnly); else onSetup(); };
  const send = event => { event.preventDefault(); if (tavus.send(draft)) setDraft(''); };
  const statusLabel = connecting ? 'Connecting' : paused ? 'Paused' : connected ? tavus.speaking ? 'Speaking' : tavus.micMuted ? 'Text mode' : 'Listening' : 'Portrait preview';
  return <main className={`conversation-page ${compact ? 'compact' : ''}`}>
    <div className="page-heading"><div><div className="eyebrow">A little space for you</div><h1>Conversation</h1></div><button className="button button-outline reflection-trigger" onClick={onReflection}><Leaf size={19} />Take a quiet moment</button></div>
    <div className="conversation-layout">
      <section className="call-panel" aria-label="Conversation with Dawid">
        <div className="avatar-stage"><img className="avatar-portrait" src="/dawid.png" alt="Dawid’s portrait" /><AvatarMedia remote={tavus.remote} muted={soundMuted || paused} onPlaybackError={onPlaybackError} /><div className="avatar-badges"><span className="ai-badge">{portraitMode ? "Portrait · live voice" : "AI avatar"}</span><span className={`status-badge ${connected && !paused ? 'live' : ''}`} aria-live="polite">{connecting ? <CircleNotch size={15} className="spin" /> : <span className="status-dot" />}{statusLabel}</span></div><div className="avatar-caption">{captions && connected ? lastAssistant?.text || 'What would you like to explore today?' : 'What is on your mind today?'}</div>{connected && <button className="sound-control icon-button" onClick={() => setSoundMuted(!soundMuted)} aria-label={soundMuted ? 'Unmute Dawid' : 'Mute Dawid'}>{soundMuted ? <SpeakerSlash size={22} /> : <SpeakerHigh size={22} />}</button>}</div>
        <div className="call-controls">
          {!connected && !connecting && <div className="connect-intro"><div><h2>Ready when you are.</h2><p>{portraitMode ? "Dawid’s photo, a live AI conversation, and a temporary stock voice." : "Connect for a live conversation with Dawid’s AI guide."}</p></div><button className="button button-dark" onClick={() => connect(false)}>Connect<ArrowRight size={21} /></button></div>}
          {connecting && <div className="connecting-notice" role="status"><CircleNotch size={22} className="spin" /><span>Getting your conversation ready…</span><button className="text-button" onClick={() => void tavus.end()}>Cancel</button></div>}
          {tavus.error && <div className="inline-error" role="alert"><p>{tavus.error}</p><button className="icon-button" onClick={tavus.clearError} aria-label="Dismiss message"><X size={18} /></button></div>}
          {playbackBlocked && connected && <button className="text-button" onClick={() => { document.querySelectorAll('audio, video').forEach(media => void media.play()); setPlaybackBlocked(false); }}>Tap to enable avatar audio and video</button>}
          <form className="composer" onSubmit={send}><input ref={input} aria-label="Message Dawid" maxLength={4000} value={draft} onChange={event => setDraft(event.target.value)} placeholder={paused ? 'Conversation paused' : connected ? 'Ask or share a thought…' : 'Connect to start a conversation…'} disabled={!connected || paused} /><button className="icon-button keyboard-button" type="button" aria-label="Use keyboard" disabled={!connected || paused} onClick={() => input.current?.focus()}><Keyboard size={23} /></button><button className="mic-button" type={draft.trim() ? 'submit' : 'button'} onClick={draft.trim() ? undefined : () => void tavus.toggleMic()} disabled={!connected || paused} aria-label={draft.trim() ? 'Send message' : tavus.micMuted ? 'Turn microphone on' : 'Turn microphone off'}>{draft.trim() ? <ArrowRight size={24} /> : tavus.micMuted ? <MicrophoneSlash size={24} /> : <Microphone size={24} />}</button></form>
          <div className="control-row">{connected ? <><span className="microphone-caption">{paused ? 'Take your time' : tavus.micMuted ? 'Microphone off' : 'Microphone on'}</span><button className="control-button" onClick={() => void tavus.setPaused(!paused)}>{paused ? <Play size={17} weight="fill" /> : <Pause size={17} weight="fill" />}{paused ? 'Resume' : 'Pause'}</button><button className="control-button end-button" onClick={() => void tavus.end()}><Stop size={14} weight="fill" />End</button></> : <><span className="microphone-caption">Your camera stays off.</span><button className="text-button text-connect" disabled={connecting} onClick={() => connect(true)}><Keyboard size={18} />Connect with text</button></>}</div>
        </div>
      </section>
      <aside className="conversation-notes"><div className="transcript-heading"><h2>In this conversation</h2><span>Live notes</span></div><div className="transcript" ref={transcript} aria-live="polite" aria-relevant="additions text">{tavus.messages.length ? tavus.messages.map(message => <div key={message.id} className={`transcript-message ${message.role}`}><div className="message-meta"><span>{message.role === 'assistant' ? 'Dawid’s AI guide' : 'You'}</span>{message.pending && <small>Sent</small>}</div><p>{message.text}</p>{message.interrupted && <small>Interrupted</small>}</div>) : <div className="transcript-empty"><ChatCircle size={30} /><h3>A conversation starts<br />with a little openness.</h3><p>Your live conversation will appear here. Nothing has been said yet.</p></div>}</div><div className="conversation-footnote"><Leaf size={19} /><p>Leave with one small thing<br />to carry into your day.</p></div></aside>
    </div><p className="conversation-disclosure">You’re interacting with AI inspired by Dawid. Your judgment and real-world connections come first.{portraitMode && " Portrait mode uses the original photo; face animation is pending."}</p>
  </main>;
}
function Practices({ onReflection, actions, onDelete, onToggle }) {
  return <main className="content-page"><div className="eyebrow">From insight to everyday life</div><h1>Small practices.<br />Meaningful moments.</h1><p className="page-intro">A pause, a little care, a simple act of reciprocity.</p><div className="practice-feature"><div><Leaf size={30} /><h2>Take a quiet moment</h2><p>One minute to feel the ground beneath you and let your breath settle naturally.</p></div><button className="button button-dark" onClick={onReflection}>Begin reflection<ArrowRight size={22} /></button></div><div className="saved-actions"><div className="section-heading"><h2>Your small actions</h2><span>Saved only on this device</span></div>{actions.length ? actions.map(action => <div className="saved-action" key={action.id}><button className={`action-check ${action.done ? 'checked' : ''}`} onClick={() => onToggle(action.id)} aria-label={action.done ? 'Mark action incomplete' : 'Mark action complete'} aria-pressed={Boolean(action.done)}>{action.done && <Check size={17} />}</button><p className={action.done ? 'completed-action' : ''}>{action.text}</p><button className="icon-button" onClick={() => onDelete(action.id)} aria-label={`Delete action: ${action.text}`}><Trash size={20} /></button></div>) : <p className="empty-actions">Start a reflection and save one kind thing you’d like to do today.</p>}</div></main>;
}
function Settings({ config, captions, setCaptions, compact, setCompact }) {
  const [readiness, setReadiness] = useState(null);
  const [checking, setChecking] = useState(false);
  const check = async () => {
    setChecking(true);
    try { const response = await fetch('/api/readiness'); const data = await response.json(); setReadiness(response.ok ? data : { error: data.message }); }
    catch { setReadiness({ error: 'The app server could not be reached.' }); }
    finally { setChecking(false); }
  };
  return <main className="content-page settings-page"><div className="eyebrow">Make room for what works for you</div><h1>Your experience</h1><p className="page-intro">Simple preferences for a thoughtful conversation.</p><section className="settings-section"><h2>Conversation</h2><label className="setting-row"><div><strong>Avatar captions</strong><p>Show Dawid’s latest words over the video.</p></div><input type="checkbox" checked={captions} onChange={event => setCaptions(event.target.checked)} /></label><label className="setting-row"><div><strong>Focused layout</strong><p>Give the avatar more space by hiding live notes.</p></div><input type="checkbox" checked={compact} onChange={event => setCompact(event.target.checked)} /></label></section><section className="settings-section"><h2>Live connection</h2><div className="setup-row"><span>Tavus connection</span><span className="setup-value">{config?.keyConfigured ? 'Configured' : 'Not configured'}</span></div><div className="setup-row"><span>Dawid’s avatar</span><span className="setup-value">{config?.faceConfigured ? 'Animated avatar configured' : config?.ready ? 'Original photo · portrait mode' : 'Awaiting training'}</span></div><div className="setup-row"><span>Dawid’s voice</span><span className="setup-value">{config?.voiceConfigured ? config.voiceLabel : 'Awaiting source audio'}</span></div><div className="setup-row"><span>Awakened Guide prompt</span><span className="setup-value">{config?.promptHash ? 'Loaded · all 27 sections' : 'Checking…'}</span></div><button className="button button-outline" onClick={check} disabled={checking}>{checking && <CircleNotch size={18} className="spin" />}{checking ? 'Checking connection' : 'Check connection'}</button>{readiness && <p className={`connection-result ${readiness.error ? 'error-text' : ''}`} role="status">{readiness.error || (readiness.connected ? readiness.mediaReady ? config?.presentation === 'portrait' ? 'Tavus is connected. Live voice is ready in portrait mode.' : 'Tavus is connected. Avatar and voice are ready.' : 'Tavus is connected. Dawid’s avatar and voice still need to be trained.' : 'Add the Tavus key on the server to connect.')}</p>}</section><p className="muted-copy">The app does not save your conversation transcript. Voice and video are processed by Tavus during live calls. Your camera stays off.</p></main>;
}
export function App() {
  const [route, setRoute] = useState(getRoute);
  const [modal, setModal] = useState(null);
  const [actions, setActions] = useState(getActions);
  const [toast, setToast] = useState('');
  const [config, setConfig] = useState(null);
  const [captions, setCaptions] = useState(true);
  const [compact, setCompact] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');
  const tavus = useTavus();
  const wasPaused = useRef(false);
  const navigate = useCallback(async next => { if (next !== 'conversation') await tavus.end(); location.hash = next; setRoute(next); }, [tavus.end]);
  const startConversation = prompt => { setInitialPrompt(prompt || ''); void navigate('conversation'); };
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); if (route !== 'conversation') setInitialPrompt(''); }, [route]);
  useEffect(() => { const listener = () => { const next = getRoute(); if (next !== 'conversation') void tavus.end(); setRoute(next); }; window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); }, [tavus.end]);
  useEffect(() => { fetch('/api/status').then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(setConfig).catch(() => setToast('The app server is unavailable. Live conversation is not connected.')); }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer); }, [toast]);
  const openReflection = () => { wasPaused.current = tavus.status === 'paused'; if (tavus.status === 'connected') void tavus.setPaused(true); setModal('reflection'); };
  const closeModal = useCallback(() => { setModal(null); if (!wasPaused.current) void tavus.setPaused(false); }, [tavus.setPaused]);
  const persistActions = value => { try { localStorage.setItem('dawid-actions', JSON.stringify(value)); setActions(value); return true; } catch { setToast('This browser could not save your action. Try enabling local storage.'); return false; } };
  const saveAction = text => persistActions([{ id: crypto.randomUUID(), text: text.slice(0, 240), done: false }, ...actions].slice(0, 50));
  return <div className={`app ${route === 'home' ? 'home-app' : 'inner-app'}`}>
    {route === 'home' ? <Landing navigate={navigate} onApproach={() => setModal('approach')} onReflection={openReflection} onStart={startConversation} /> : <><Sidebar route={route} navigate={navigate} /><div className="app-content"><header className="app-header"><a className="wordmark" href="#home">Dawid</a><span className="header-tagline">A calmer you. A kinder tomorrow.</span><button className="icon-button profile-shortcut" aria-label="Open profile" onClick={() => navigate('profile')}><UserCircle size={28} /></button></header>{route === 'conversation' && <Conversation tavus={tavus} onReflection={openReflection} onSetup={() => setModal('setup')} ready={config?.ready} captions={captions} compact={compact} presentation={config?.presentation} initialPrompt={initialPrompt} />}{route === 'practices' && <Practices onReflection={openReflection} actions={actions} onDelete={id => persistActions(actions.filter(item => item.id !== id))} onToggle={id => persistActions(actions.map(item => item.id === id ? { ...item, done: !item.done } : item))} />}{route === 'settings' && <Settings config={config} captions={captions} setCaptions={setCaptions} compact={compact} setCompact={setCompact} />}{route === 'profile' && <main className="content-page profile-page"><div className="eyebrow">Your own path</div><h1>A little more<br />connected.</h1><p className="page-intro">You don’t need an account to pause, reflect, or begin a conversation.</p><div className="profile-note"><BookmarkSimple size={30} /><div><h2>Carry something into your day.</h2><p>Your saved actions live on this device. Your conversations stay out of your local history.</p><button className="text-button" onClick={() => navigate('practices')}>View your small actions<ArrowRight size={20} /></button></div></div></main>}</div></>}
    {modal === 'reflection' && <Reflection onClose={closeModal} onSave={saveAction} returnLabel={route === 'conversation' ? 'Back to conversation' : 'Back to exploring'} />}
    {modal === 'approach' && <Modal title="A clear mirror. A humble guide." onClose={closeModal}><p>Dawid’s AI guide brings together reflection, care for the Earth, and small acts of reciprocity.</p><p>It draws on the Awakened Guide teachings while distinguishing spiritual interpretation from factual evidence. It supports your judgment, your community, and your own path.</p><button className="button button-dark full-width" onClick={() => { closeModal(); void navigate('conversation'); }}>Start a conversation<ArrowRight size={21} /></button></Modal>}
    {modal === 'setup' && <Modal title="Dawid’s live avatar is on its way." onClose={closeModal}><p>{config?.keyConfigured ? 'The Tavus connection is configured. Dawid’s face and voice need to finish setup before a live conversation can begin.' : 'The live connection needs to be configured before a conversation can begin.'}</p><p>You can explore a quiet reflection and save a small action now.</p><button className="button button-dark full-width" onClick={() => { closeModal(); openReflection(); }}>Try a reflection<ArrowRight size={21} /></button><button className="text-button full-width" onClick={() => { closeModal(); void navigate('settings'); }}>View connection status</button></Modal>}
    {toast && <div className="toast" role="status">{toast}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={17} /></button></div>}
  </div>;
}
