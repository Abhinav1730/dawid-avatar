// Tavus emits both PAL and legacy replica events for the same turn.
// Normalize and deduplicate by inference/turn identity, not role spelling.
export function normalizeUtterance(event) {
  if (event?.event_type !== 'conversation.utterance') return null;
  const { role, speech, interrupted } = event.properties || {};
  if (!['pal', 'replica', 'user'].includes(role) || typeof speech !== 'string' || !speech.trim()) return null;
  const normalizedRole = role === 'user' ? 'user' : 'assistant';
  const identity = event.inference_id ?? event.turn_idx ?? event.seq ?? speech;
  return { id: `${normalizedRole}:${identity}`, role: normalizedRole, text: speech.slice(0, 20_000), interrupted: Boolean(interrupted) };
}

export function appendUtterance(messages, event) {
  const message = normalizeUtterance(event);
  if (!message) return messages;
  const existing = messages.findIndex(item => item.id === message.id);
  if (existing >= 0) return messages.map((item, index) => index === existing ? message : item);
  // A text response is echoed as a user utterance: replace its optimistic copy.
  const pending = message.role === 'user' ? messages.findIndex(item => item.pending && item.text === message.text) : -1;
  if (pending >= 0) return messages.map((item, index) => index === pending ? message : item);
  return [...messages, message].slice(-100);
}
