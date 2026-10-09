import { makeTavus } from '../server/tavus.mjs';

const tavus = makeTavus();
function mediaUrl(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`Set ${label} to a direct-download HTTPS media URL.`); }
  if (url.protocol !== 'https:' || /(^|\.)(youtube\.com|youtu\.be)$/.test(url.hostname)) throw new Error(`${label} must be a direct-download HTTPS media URL, not a watch page.`);
  return url.href;
}
try {
  // Resume resources already submitted; never duplicate a pending training job.
  if (!tavus.config().voice) {
    const audio = mediaUrl(process.env.TAVUS_TRAINING_AUDIO_URL, 'TAVUS_TRAINING_AUDIO_URL');
    const voice = await tavus.request('voices', { method: 'POST', body: { voice_name: 'Dawid', training_audio_url: audio, description: 'Dawid source voice for the Awakened Guide app' } });
    if (!voice.voice_id) throw new Error('Tavus did not return a voice identifier. Inspect the account before retrying.');
    tavus.save({ voiceId: voice.voice_id });
    console.log('Voice training submitted. Re-run this command to check progress.');
  }
  const voice = await tavus.request(`voices/${encodeURIComponent(tavus.config().voice)}`);
  console.log(`Voice status: ${voice.status}`);
  if (voice.status === 'error') throw new Error('Voice training failed. Inspect the training job in Tavus.');
  if (voice.status !== 'completed') process.exit(0);
  if (!tavus.config().face) {
    const image = mediaUrl(process.env.TAVUS_TRAINING_IMAGE_URL, 'TAVUS_TRAINING_IMAGE_URL');
    const face = await tavus.request('faces', { method: 'POST', body: { face_name: 'Dawid', model_name: 'phoenix-4.5', train_image_url: image, default_voice_id: tavus.config().voice, auto_fix_training_image: true } });
    if (!face.face_id) throw new Error('Tavus did not return a face identifier. Inspect the account before retrying.');
    tavus.save({ faceId: face.face_id });
    console.log('Face training submitted. Re-run this command to check progress.');
  }
  const face = await tavus.request(`faces/${encodeURIComponent(tavus.config().face)}`);
  console.log(`Face status: ${face.status}`);
  if (face.status === 'error') throw new Error('Face training failed. Inspect the training job in Tavus.');
  if (face.status !== 'completed') process.exit(0);
  await tavus.ensurePal();
  console.log('Dawid is ready with the exact supplied system prompt. Reload the app.');
} catch (error) { console.error(`${error.code || 'SETUP_REQUIRED'}: ${error.message}`); process.exitCode = 1; }
