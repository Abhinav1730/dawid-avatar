import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChatCircle, Clock, DotsThree, Heart, Keyboard, Leaf, Microphone, Pause, Play, Plus, User } from '@phosphor-icons/react';

const starters = ['What’s on your mind right now?', 'I’m feeling stuck. Can you help me think it through?', 'How can I be kinder to myself today?', 'I’d like to feel more connected to the world around me.', 'Can we find one small, practical step I could take?'];
const values = ['Real conversations', 'A calmer mind', 'Practical perspective', 'Small steps forward', 'You, at your own pace'];
const principles = [
  [ChatCircle, 'A space to talk', 'Bring your real thoughts, questions, and feelings.'],
  [User, 'Your pace, always', 'Talk, type or pause — it’s up to you.'],
  [Heart, 'Compassionate perspective', 'Explore with kindness, not judgment.'],
  [BookOpen, 'Reflection, not advice', 'A thoughtful space to explore your perspective.'],
  [Leaf, 'Practical next steps', 'Turn insight into small, doable actions.'],
  [Clock, 'Inspired by a human', 'Built with care, guided by Dawid’s philosophy and way of seeing the world.'],
];
const questions = [
  ['What is Dawid?', 'An AI companion inspired by Dawid and the Awakened Guide teachings. Bring a thought, question an interpretation, and explore what feels useful. Your own judgment comes first.'],
  ['How does a conversation work?', 'Open a conversation and choose Connect for voice, or Connect with text to keep your microphone off. The guide responds with live AI voice and text alongside Dawid’s original portrait. Your camera stays off. You can pause or end whenever you need.'],
  ['Is this a substitute for professional support?', 'This guide offers reflection and general support. It does not provide professional medical or mental health care. Trusted people and qualified professionals remain important sources of support.'],
];

function useReveals(root) {
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const elements = [...root.current.querySelectorAll('[data-reveal]')];
    if (media.matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    }), { threshold: 0.1 });
    elements.forEach(element => { element.classList.add('reveal-ready'); observer.observe(element); });
    const show = () => { if (media.matches) elements.forEach(element => element.classList.add('is-revealed')); };
    media.addEventListener('change', show);
    return () => { observer.disconnect(); media.removeEventListener('change', show); };
  }, [root]);
}

function SampleConversation({ onStart, onReflection }) {
  const [mode, setMode] = useState('talk');
  const [menu, setMenu] = useState(false);
  const [draft, setDraft] = useState('');
  const [reply, setReply] = useState(false);
  const panel = useRef(null);
  useEffect(() => {
    if (!menu) return;
    const dismiss = event => { if (!panel.current?.contains(event.target)) setMenu(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [menu]);
  const selectMode = next => { setMode(next); setMenu(false); };
  const closeOptions = () => { setMenu(false); panel.current.querySelector('.q-more').focus(); };
  return <section className="q-sample" aria-label="Interactive sample conversation" ref={panel} onKeyDown={event => {
    if (event.key === 'Escape' && menu) { setMenu(false); panel.current.querySelector('.q-more').focus(); }
  }}>
    <div className="q-sample-top"><span><i />Portrait mode · AI guide</span><span>Sample conversation</span></div>
    <div className="q-exchange" aria-live="polite" aria-atomic="true">
      <div className="q-bubble q-user"><Microphone size={23} /><div><span>You</span><p>{reply ? 'I keep thinking about tomorrow.' : 'My mind feels full today.'}</p></div></div>
      <div className="q-bubble q-guide" key={`${mode}-${reply}`}><Heart size={24} /><div><span>Dawid’s AI guide</span><p>{mode === 'pause' ? 'A little breathing room. Continue whenever you’re ready.' : reply ? 'What needs your attention today, and what could wait? We can look at one thing at a time.' : 'We can start with one thought. What feels most present?'}</p></div></div>
    </div>
    {mode === 'type' && <form className="q-sample-draft" onSubmit={event => { event.preventDefault(); if (draft.trim()) onStart(draft.trim()); }}><label className="sr-only" htmlFor="sample-thought">A thought to bring to the conversation</label><input autoFocus id="sample-thought" value={draft} maxLength={4000} onChange={event => setDraft(event.target.value)} placeholder="Bring a thought with you…" /><button aria-label="Open conversation with this draft" disabled={!draft.trim()}><ArrowRight size={20} /></button></form>}
    <div className="q-sample-controls"><button aria-pressed={mode === 'talk'} onClick={() => selectMode('talk')}><span className="q-control-icon"><Microphone size={23} /></span><span><strong>Talk</strong><small>Explore voice mode</small></span></button><button aria-pressed={mode === 'type'} onClick={() => selectMode('type')}><span className="q-control-icon"><Keyboard size={23} /></span><span><strong>Type</strong><small>Write a thought</small></span></button><button className="q-more" aria-label="More sample options" aria-expanded={menu} aria-controls="sample-options" onClick={() => setMenu(!menu)}><DotsThree size={27} /></button></div>
    {menu && <div id="sample-options" className="q-sample-menu"><button onClick={() => { selectMode(mode === 'pause' ? 'talk' : 'pause'); closeOptions(); }}>{mode === 'pause' ? <Play size={17} /> : <Pause size={17} />}{mode === 'pause' ? 'Resume sample' : 'Pause sample'}</button><button onClick={() => { setReply(!reply); setMode('talk'); closeOptions(); }}><ChatCircle size={17} />{reply ? 'Reset sample' : 'Try a sample reply'}</button><button onClick={() => { closeOptions(); onReflection(); }}><Leaf size={17} />Take a quiet moment</button></div>}
    <p className="q-sample-note">{mode === 'type' ? 'Your words become a draft. Nothing is sent yet.' : mode === 'pause' ? 'Sample paused. Resume from the options menu.' : 'Scripted preview. Connect on the next page for live AI voice.'}</p>
  </section>;
}

function StarterCarousel({ onStart }) {
  const rail = useRef(null);
  const [index, setIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    const node = rail.current;
    const update = () => {
      const stride = node.children[1].offsetLeft - node.children[0].offsetLeft;
      setIndex(Math.round(node.scrollLeft / stride));
      setAtEnd(node.scrollLeft >= node.scrollWidth - node.clientWidth - 2);
    };
    const observer = new ResizeObserver(update);
    observer.observe(node); node.addEventListener('scroll', update, { passive: true }); update();
    return () => { observer.disconnect(); node.removeEventListener('scroll', update); };
  }, []);
  const move = direction => {
    const node = rail.current;
    const stride = node.children[1].offsetLeft - node.children[0].offsetLeft;
    node.scrollBy({ left: direction * stride, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return <section className="q-starters q-wide" aria-label="Conversation starters" data-reveal>
    <div className="q-starters-heading"><h2 className="q-label">Conversation starters</h2><div><button aria-label="Previous conversation starters" disabled={index === 0} onClick={() => move(-1)}><ArrowLeft size={21} /></button><button aria-label="Next conversation starters" disabled={atEnd} onClick={() => move(1)}><ArrowRight size={21} /></button></div></div>
    <div className="q-starter-rail" ref={rail} tabIndex={0} role="region" aria-label="Choose a conversation starter" aria-roledescription="carousel" onKeyDown={event => {
      if (event.target === event.currentTarget && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
    }}>{starters.map((thought, i) => <button className="q-starter" key={thought} aria-label={`Explore: ${thought}`} onClick={() => onStart(thought)}><span>{thought}</span><ArrowRight size={22} /><span className="sr-only">{i + 1} of {starters.length}</span></button>)}</div>
    <span className="sr-only" aria-live="polite">Starting with question {index + 1} of {starters.length}</span>
  </section>;
}

export function Landing({ navigate, onStart, onReflection, onApproach }) {
  const root = useRef(null);
  useReveals(root);
  const scrollTo = id => {
    const target = document.getElementById(id);
    target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    target?.focus({ preventScroll: true });
  };
  const start = () => onStart();
  return <div className="quiet-form" ref={root}>
    <a className="q-skip" href="#experience" onClick={event => { event.preventDefault(); scrollTo('experience'); }}>Skip to the experience</a>
    <header className="q-header q-container"><a className="q-wordmark" href="#home" aria-label="Dawid home">Dawid</a><nav aria-label="Explore Dawid"><button onClick={() => scrollTo('experience')}>Experience</button><button onClick={() => scrollTo('practice')}>Practices</button><button onClick={() => scrollTo('approach')}>Approach</button></nav><button className="q-button q-lilac q-header-cta" onClick={start}>Start a conversation<ArrowRight size={20} /></button></header>
    <main>
      <section className="q-hero q-container" aria-labelledby="quiet-title">
        <aside className="q-hero-aside"><p className="q-label">AI<br /> Reflection<br /> Everyday care</p><p>A more thoughtful way to talk, reflect and find your next step — with an AI companion inspired by Dawid.</p></aside>
        <h1 id="quiet-title"><span className="q-mask"><span>Room to think.</span></span><span className="q-mask"><strong>Space to be.</strong></span></h1>
        <div className="q-hero-image"><img src="/images/dawid-editorial.webp" alt="Dawid in front of lush green foliage" width="1641" height="959" fetchPriority="high" /></div>
        <div className="q-hero-copy"><p className="q-hero-tagline">Thoughtful conversation.<br />Small acts of care.<br />A calmer you.</p><p>Talk or type with Dawid — an AI guide for reflection, compassion and practical care. Bring what’s on your mind. Take a breath. You don’t have to figure it all out at once.</p><button className="q-button q-lilac" onClick={start}>Start a conversation<ArrowRight size={20} /></button><button className="q-button q-outline" onClick={() => scrollTo('experience')}><Play size={16} weight="fill" />View the experience</button></div>
        <SampleConversation onStart={onStart} onReflection={onReflection} />
      </section>
      <div className="q-values" aria-label="Our values"><div>{values.map((value, index) => <span key={value}>{index > 0 && <i>/</i>}{value}</span>)}</div></div>
      <section className="q-experience q-container" id="experience" tabIndex={-1} aria-labelledby="experience-title" data-reveal><h2 className="q-label" id="experience-title">Three ways<br />to connect</h2><div className="q-connection-ways">{[[Microphone, 'Talk.', 'Speak naturally and hear the AI guide respond.'], [Keyboard, 'Type.', 'Share your thoughts in writing.'], [Pause, 'Pause.', 'Take your time. Return whenever you’re ready.']].map(([Icon, title, copy], index) => <article key={title}><span className="q-way-number">0{index + 1}</span><div><Icon size={36} /><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>
      <StarterCarousel onStart={onStart} />
      <section className="q-practice" id="practice" tabIndex={-1} aria-labelledby="practice-title" data-reveal><img className="q-practice-image" src="/images/woodland-pause.webp" alt="Morning light on a green woodland path" width="1536" height="1024" loading="lazy" /><div className="q-practice-content q-container"><div><div className="q-label">A minute for you</div><h2 id="practice-title">A little distance<br />from the noise.</h2><p>Sometimes a short pause can shift a lot. Try a one-minute reflection — a simple way to reconnect with yourself before what’s next.</p><button className="q-button q-white" onClick={onReflection}><Play size={19} weight="fill" />Start a one-minute practice</button></div><div className="q-practice-timer"><span>01:00</span><p>Just this moment.</p><hr /><button aria-label="Begin one-minute reflection" onClick={onReflection}><Play size={28} weight="fill" /></button><div className="q-label">A small pause<br />A clearer you</div></div></div></section>
      <section className="q-approach q-container" id="approach" tabIndex={-1} aria-labelledby="approach-title" data-reveal><div className="q-approach-intro"><div className="q-label">Our approach</div><h2 id="approach-title">Practical care<br />for everyday life.</h2><p>Dawid is an AI companion inspired by Dawid, created to support reflection, compassion and practical next steps. It’s a space to think more clearly, feel a little lighter and move forward in your own time.</p></div><div className="q-principles">{principles.map(([Icon, title, copy]) => <article key={title}><Icon size={30} /><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>
      <section className="q-faq q-container" aria-labelledby="faq-title" data-reveal><div><div className="q-label">Frequently asked questions</div><h2 id="faq-title">A few quick answers.</h2><p>Everything you need to know to get started.</p></div><div className="q-questions">{questions.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={19} /></summary><p>{answer}</p></details>)}</div></section>
      <section className="q-closing q-wide" aria-labelledby="closing-title" data-reveal><div><div className="q-label">Take the next step</div><h2 id="closing-title">A thought.<br />A pause. A brighter you.</h2></div><div><p>Bring what’s on your mind.<br />Dawid is here when you’re ready.</p><button className="q-button q-black" onClick={start}>Start a conversation<ArrowRight size={22} /></button></div></section>
    </main>
    <footer className="q-footer q-container"><a className="q-wordmark" href="#home">Dawid</a><p>Thoughtful conversation<br />for a more human tomorrow.</p><nav aria-label="Footer"><button onClick={() => scrollTo('experience')}>Experience</button><button onClick={() => navigate('practices')}>Practices</button><button onClick={onApproach}>Approach</button></nav><p>A calmer you<br />is a brighter tomorrow.</p></footer>
  </div>;
}
