import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` ${extra}`}`); if (!ok) failures += 1; };

let mode = 'ok';
let lastRequest = null;
const mock = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  lastRequest = { url: req.url, auth: req.headers.authorization, body: JSON.parse(Buffer.concat(chunks).toString() || '{}') };
  const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (mode === 'ok') send(200, { choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'Hello from Kimmy!' } }] });
  else if (mode === 'think') send(200, { choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: '<think>secret reasoning</think>Visible answer.' } }] });
  else if (mode === 'think-cut') send(200, { choices: [{ finish_reason: 'length', message: { role: 'assistant', content: '<think>still thinking and ran out of tokens' } }] });
  else if (mode === 'badkey') send(401, { error: { message: 'Invalid API Key', type: 'invalid_request_error', code: 'invalid_api_key' } });
  else if (mode === 'nomodel') send(404, { error: { message: 'The model does not exist', type: 'invalid_request_error', code: 'model_not_found' } });
  else if (mode === 'limit') send(429, { error: { message: 'rate limit', type: 'tokens', code: 'rate_limit_exceeded' } });
});
await new Promise((r) => mock.listen(0, '127.0.0.1', r));
const mockPort = mock.address().port;
const appPort = 20000 + Math.floor(Math.random() * 20000);

const startApp = (env) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['server/index.js', '--production'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(appPort), HOST: '127.0.0.1', GROQ_BASE_URL: `http://127.0.0.1:${mockPort}/openai/v1`, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => { if (String(d).includes('server:')) resolve(child); });
  child.stderr.on('data', () => {});
  child.on('error', reject);
  setTimeout(() => reject(new Error('server did not start')), 8000);
});
const stopApp = (child) => new Promise((r) => { child.on('exit', r); child.kill('SIGTERM'); });
const ask = async (body = { message: 'Why is my LED dark?', action: 'hint', context: { lessonTitle: 'LED basics' } }) => {
  const res = await fetch(`http://127.0.0.1:${appPort}/api/guide`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
};

let app = await startApp({ GROQ_API_KEY: 'test-key', GROQ_MODEL: '' });
let r = await ask();
check('200 + reply on success', r.status === 200 && r.data.reply === 'Hello from Kimmy!', JSON.stringify(r));
check('hits /chat/completions with bearer key', lastRequest.url === '/openai/v1/chat/completions' && lastRequest.auth === 'Bearer test-key');
check('default model is qwen/qwen3.8-27b', lastRequest.body.model === 'qwen/qwen3.8-27b');
check('qwen3.8: reasoning_effort none + reasoning_format hidden', lastRequest.body.reasoning_effort === 'none' && lastRequest.body.reasoning_format === 'hidden');
check('qwen3.8: instruct sampling (temp 0.7, top_p 0.8)', lastRequest.body.temperature === 0.7 && lastRequest.body.top_p === 0.8);
check('uses max_completion_tokens, no include_reasoning with reasoning_format', lastRequest.body.max_completion_tokens > 0 && !('max_tokens' in lastRequest.body) && !('include_reasoning' in lastRequest.body));
check('system prompt first, user message last', lastRequest.body.messages[0].role === 'system' && lastRequest.body.messages.at(-1).role === 'user');
check('context sent once (in user message only)', !lastRequest.body.messages[0].content.includes('LED basics') && lastRequest.body.messages.at(-1).content.includes('LED basics'));

mode = 'think'; r = await ask();
check('<think> block stripped from reply', r.status === 200 && r.data.reply === 'Visible answer.', JSON.stringify(r));
mode = 'think-cut'; r = await ask();
check('truncated thinking-only output -> friendly 502, no leak', r.status === 502 && !JSON.stringify(r.data).includes('thinking'), JSON.stringify(r));
mode = 'badkey'; r = await ask();
check('401 -> key error message', r.status === 502 && /GROQ_API_KEY/.test(r.data.error), JSON.stringify(r));
mode = 'nomodel'; r = await ask();
check('model_not_found -> names the model + GROQ_MODEL hint', r.status === 502 && /GROQ_MODEL/.test(r.data.error) && /qwen3\.8/.test(r.data.error), JSON.stringify(r));
mode = 'limit'; r = await ask();
check('429 passes through as 429', r.status === 429, JSON.stringify(r));
mode = 'ok'; r = await ask({ message: '   ' });
check('empty message -> 400', r.status === 400);
await stopApp(app);

app = await startApp({ GROQ_API_KEY: 'test-key', GROQ_MODEL: 'openai/gpt-oss-20b' });
r = await ask();
check('gpt-oss: include_reasoning false, effort low, no reasoning_format', lastRequest.body.include_reasoning === false && lastRequest.body.reasoning_effort === 'low' && !('reasoning_format' in lastRequest.body));
await stopApp(app);
app = await startApp({ GROQ_API_KEY: 'test-key', GROQ_MODEL: 'llama-3.3-70b-versatile' });
r = await ask();
check('llama: no reasoning params', !('reasoning_effort' in lastRequest.body) && !('reasoning_format' in lastRequest.body) && !('include_reasoning' in lastRequest.body));
await stopApp(app);

app = await startApp({ GROQ_API_KEY: 'your_groq_api_key_here' });
r = await ask();
check('placeholder key -> 503 setup message', r.status === 503 && /GROQ_API_KEY/.test(r.data.error), JSON.stringify(r));
await stopApp(app);

mock.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll Groq integration checks passed');
process.exit(failures ? 1 : 0);
