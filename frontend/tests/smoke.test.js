const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = html.match(/<script>\n([\s\S]*)<\/script>\n<\/body>/);

assert(scriptMatch, 'inline app script should exist');
new vm.Script(scriptMatch[1]);

const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
const referencedIds = [...new Set(
  [...scriptMatch[1].matchAll(/document\.getElementById\('([^']+)'\)/g)].map(match => match[1])
)];
const missingIds = referencedIds.filter(id => !ids.has(id));

assert.deepStrictEqual(missingIds, [], `all getElementById references should exist in index.html; missing: ${missingIds.join(', ')}`);
assert(html.includes("['localhost', '127.0.0.1'].includes(window.location.hostname)"), 'local API fallback should cover localhost and 127.0.0.1');
assert(html.includes('function parseNotificationPayload(payload)'), 'notification payload parsing should be defensive');
assert(scriptMatch[1].includes("api('GET', '/api/compatibility/history')"), 'dashboard should use the supported compatibility history endpoint');
assert(!scriptMatch[1].includes('/api/compatibility/${currentUser.id}/history'), 'dashboard should not call a non-existent per-user history route');
assert(ids.has('sec-insights'), 'insights section should exist');
assert(scriptMatch[1].includes("api('GET', '/api/insights/overview')"), 'insights should load the overview endpoint');
assert(scriptMatch[1].includes("api('GET', '/api/insights/query-lab')"), 'insights should load the query-lab endpoint');
assert(html.includes('data-section="insights"'), 'insights navigation entry should exist');

console.log('frontend smoke test passed');
