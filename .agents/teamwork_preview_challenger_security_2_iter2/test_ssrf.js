// test_ssrf.js
const { URL } = require('url');

// Replicating validateTargetUrl logic from src/components/DataImport.tsx
function validateTargetUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (e) {
    throw new Error('The target URL is invalid or not an absolute URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL must use http: or https: protocol.');
  }

  const hostname = parsed.hostname.toLowerCase();
  
  if (!hostname || hostname.trim() === '') {
    throw new Error('The target URL is invalid or has an empty hostname.');
  }

  const isLocal =
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0' ||
    hostname === '[::]' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname === '169.254.169.254' ||
    hostname.startsWith('169.254.');

  if (isLocal) {
    return { status: 'blocked', reason: 'isLocal detected' };
  } else {
    // Known trusted public endpoints
    const trustedDomains = [
      'jsonplaceholder.typicode.com',
      'reqres.in',
      'api.github.com',
    ];
    const isTrusted = trustedDomains.some(d => hostname === d || hostname.endsWith('.' + d));
    if (!isTrusted) {
      return { status: 'untrusted_warning', reason: 'arbitrary external URL' };
    }
    return { status: 'allowed', reason: 'trusted domain' };
  }
}

// Test suite
const testCases = [
  'http://127.0.0.1',
  'http://127.0.0.2',
  'http://localhost',
  'http://172.18.0.1',
  'http://0.0.0.0',
  'http://[::]',
  'http://[::1]',
  'http://[::ffff:127.0.0.1]',
  'http://[::ffff:172.18.0.1]',
  'http://[::ffff:10.0.0.1]',
  'http://[::ffff:192.168.0.1]',
  'http://[0:0:0:0:0:ffff:127.0.0.1]',
  'http://127.1',
  'http://2130706433', // decimal representation of 127.0.0.1
  'http://0177.0.0.1', // octal representation
  'http://invalid-hostname-because-no-dot',
  'http://.invalid',
  'http://jsonplaceholder.typicode.com',
  'https://api.github.com/users',
  'http://evil.com'
];

console.log('--- SSRF Test Results ---');
for (const tc of testCases) {
  try {
    const res = validateTargetUrl(tc);
    console.log(`${tc} => ${JSON.stringify(res)}`);
  } catch (err) {
    console.log(`${tc} => Threw Error: ${err.message}`);
  }
}
