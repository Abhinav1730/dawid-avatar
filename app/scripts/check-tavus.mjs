import { makeTavus } from '../server/tavus.mjs';

const tavus = makeTavus();
try {
  const resources = await Promise.all([
    tavus.request('faces?face_type=user&limit=100'),
    tavus.request('voices?source=user&limit=100'),
    tavus.request('pals?pal_type=user&limit=100'),
  ]);
  console.log(JSON.stringify({ authenticated: true, configured: tavus.status(), resources: resources.map((data, index) => ({ type: ['faces', 'voices', 'pals'][index], total: data.total ?? data.total_count ?? data.data?.length, dawid: (data.data || []).filter(item => /dawid/i.test(item.face_name || item.voice_name || item.pal_name || '')).map(item => ({ name: item.face_name || item.voice_name || item.pal_name, status: item.status })) })) }, null, 2));
  if (tavus.status().ready) {
    await tavus.validateMedia();
    console.log('Configured face and voice are completed.');
  }
} catch (error) { console.error(`${error.code || 'CHECK_FAILED'}: ${error.message}`); process.exitCode = 1; }
