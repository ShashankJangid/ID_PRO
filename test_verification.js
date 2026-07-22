const fs = require('fs');
const path = require('path');

console.log('--- Adversarial Security Verification Suite ---\n');

// 1. SSRF check extraction and simulation
// Let's implement the validateTargetUrl exact logic as in DataImport.tsx
function validateTargetUrl(urlString, confirmCallback) {
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
    const proceed = confirmCallback('local', urlString);
    if (!proceed) {
      throw new Error('Request cancelled by user due to private IP warning.');
    }
  } else {
    // Known trusted public endpoints
    const trustedDomains = [
      'jsonplaceholder.typicode.com',
      'reqres.in',
      'api.github.com',
    ];
    const isTrusted = trustedDomains.some(d => hostname === d || hostname.endsWith('.' + d));
    if (!isTrusted) {
      const proceed = confirmCallback('untrusted', urlString);
      if (!proceed) {
        throw new Error('Request cancelled by user due to untrusted domain warning.');
      }
    }
  }
  return 'SUCCESS';
}

// Test cases for SSRF
const ssrfTestCases = [
  // Loopbacks
  { url: 'http://127.0.0.1', type: 'local' },
  { url: 'http://127.0.0.2', type: 'local' },
  { url: 'http://127.255.255.254', type: 'local' },
  { url: 'http://localhost', type: 'local' },
  { url: 'http://[::1]', type: 'local' },
  
  // Class B private ranges
  { url: 'http://172.16.0.1', type: 'local' },
  { url: 'http://172.18.0.1', type: 'local' },
  { url: 'http://172.31.255.255', type: 'local' },
  // Class B boundaries (should not be local, but untrusted)
  { url: 'http://172.15.255.255', type: 'untrusted' },
  { url: 'http://172.32.0.1', type: 'untrusted' },

  // Wildcards
  { url: 'http://0.0.0.0', type: 'local' },
  { url: 'http://[::]', type: 'local' },

  // Link local
  { url: 'http://169.254.169.254', type: 'local' },
  { url: 'http://169.254.10.20', type: 'local' },

  // Class A & C private ranges
  { url: 'http://10.0.0.1', type: 'local' },
  { url: 'http://192.168.1.1', type: 'local' },

  // Invalid Hostnames / protocols
  { url: 'ftp://127.0.0.1', error: 'URL must use http: or https: protocol.' },
  { url: 'http://', error: 'The target URL is invalid or not an absolute URL.' },
  { url: 'invalid-url', error: 'The target URL is invalid or not an absolute URL.' },

  // Trusted Domains (should succeed without prompt)
  { url: 'https://jsonplaceholder.typicode.com/posts', type: 'trusted' },
  { url: 'https://api.github.com/users/octocat', type: 'trusted' },
  { url: 'https://reqres.in/api/users', type: 'trusted' },
  { url: 'https://sub.api.github.com/users', type: 'trusted' },

  // Untrusted Domains (should trigger untrusted prompt)
  { url: 'https://google.com', type: 'untrusted' },
  { url: 'https://example.com', type: 'untrusted' },
];

console.log('--- 1. Testing SSRF Validation ---');
let ssrfPassed = true;
ssrfTestCases.forEach((tc) => {
  let outcome = 'unknown';
  let errorMsg = '';
  
  // Callback returns false to check if private IP/untrusted warning triggers cancellation
  const confirmCallback = (category, url) => {
    outcome = category;
    return false; // Cancel by default
  };

  try {
    const res = validateTargetUrl(tc.url, confirmCallback);
    if (res === 'SUCCESS') outcome = 'trusted';
  } catch (e) {
    errorMsg = e.message;
  }

  if (tc.error) {
    if (errorMsg === tc.error) {
      console.log(`[PASS] ${tc.url} correctly threw error: "${errorMsg}"`);
    } else {
      console.log(`[FAIL] ${tc.url} expected error "${tc.error}" but got "${errorMsg}"`);
      ssrfPassed = false;
    }
  } else {
    if (outcome === tc.type) {
      console.log(`[PASS] ${tc.url} classified correctly as: ${outcome}`);
    } else {
      console.log(`[FAIL] ${tc.url} expected classification "${tc.type}" but got "${outcome}"`);
      ssrfPassed = false;
    }
  }
});

// SSRF Bypass attempts using URL standard normalization
console.log('\n--- 1.1 Testing SSRF Hostname Normalization Bypasses ---');
const normalizationTestCases = [
  { url: 'http://2130706433', expectedHostname: '127.0.0.1', type: 'local' }, // Decimal representation of 127.0.0.1
  { url: 'http://017700000001', expectedHostname: '127.0.0.1', type: 'local' }, // Octal representation of 127.0.0.1
  { url: 'http://0x7f000001', expectedHostname: '127.0.0.1', type: 'local' }, // Hex representation of 127.0.0.1
  { url: 'http://127.0.0.1.nip.io', expectedHostname: '127.0.0.1.nip.io', type: 'local' }, // nip.io domain starting with 127.
];

normalizationTestCases.forEach((tc) => {
  let parsedHostname = '';
  try {
    const parsed = new URL(tc.url);
    parsedHostname = parsed.hostname;
  } catch (e) {
    console.log(`[INFO] URL standard parser did not parse ${tc.url}: ${e.message}`);
  }

  let outcome = 'unknown';
  let errorMsg = '';
  const confirmCallback = (category, url) => {
    outcome = category;
    return false; // Cancel by default
  };

  try {
    validateTargetUrl(tc.url, confirmCallback);
  } catch (e) {
    errorMsg = e.message;
  }

  const matchesExpectedHostname = parsedHostname === tc.expectedHostname;
  if (outcome === tc.type) {
    console.log(`[PASS] Bypass attempt ${tc.url} normalized to ${parsedHostname} and classified as: ${outcome}`);
  } else {
    console.log(`[FAIL] Bypass attempt ${tc.url} normalized to ${parsedHostname} but classified as: ${outcome} (expected: ${tc.type})`);
    ssrfPassed = false;
  }
});


// 2. ReDoS check
console.log('\n--- 2. Testing ReDoS Vulnerabilities ---');
const oldPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
const newPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)\/?$/i;

// Malicious input pattern for ReDoS
// Path component nested star: ([/\w .-]*)*
// If we have a URL like "http://example.com/" followed by many "a " and then a non-matching character,
// the old regex will backtrack exponentially.
const maliciousInput = 'http://example.com/' + 'a '.repeat(25) + '!';

console.log('Testing old pattern with malicious input...');
const startTimeOld = Date.now();
// We execute this in a try-catch and set a small timeout or limit repeats to prevent actual process freeze if it hangs
let oldFinished = false;
let oldResult;
try {
  // Let's do a smaller repeat count just in case it hangs completely (25 repetitions of "a " can take seconds/minutes on unsafe engines)
  oldResult = oldPattern.test(maliciousInput);
  oldFinished = true;
} catch (e) {
  console.log(`Old pattern errored: ${e.message}`);
}
const elapsedOld = Date.now() - startTimeOld;
console.log(`Old pattern execution finished: ${oldFinished}, result: ${oldResult}, elapsed: ${elapsedOld}ms`);

console.log('Testing new pattern with malicious input...');
const startTimeNew = Date.now();
const newResult = newPattern.test(maliciousInput);
const elapsedNew = Date.now() - startTimeNew;
console.log(`New pattern execution result: ${newResult}, elapsed: ${elapsedNew}ms`);

let redosPassed = true;
if (elapsedNew > 10) {
  console.log(`[FAIL] New pattern took too long: ${elapsedNew}ms`);
  redosPassed = false;
} else {
  console.log(`[PASS] New pattern evaluated in ${elapsedNew}ms`);
}

// 3. Custom fields & image collection maxLength check
console.log('\n--- 3. Testing custom fields and image collection label limits ---');
const orgSetupPath = path.join(__dirname, 'src/components/OrganizationSetup.tsx');
const imgColPath = path.join(__dirname, 'src/components/ImageCollectionSection.tsx');
const imgColSharedPath = path.join(__dirname, 'src/components/shared/ImageCollectionSection.tsx');

let maxLengthPassed = true;

const checkFileMaxLength = (filePath, searchContext) => {
  if (!fs.existsSync(filePath)) {
    console.log(`[FAIL] File not found: ${filePath}`);
    maxLengthPassed = false;
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('maxLength={100}')) {
    console.log(`[PASS] ${path.basename(filePath)} contains maxLength={100}`);
  } else {
    console.log(`[FAIL] ${path.basename(filePath)} does not contain maxLength={100}`);
    maxLengthPassed = false;
  }
};

checkFileMaxLength(orgSetupPath);
checkFileMaxLength(imgColPath);
checkFileMaxLength(imgColSharedPath);

console.log('\n--- VERIFICATION SUMMARY ---');
console.log(`SSRF Security: ${ssrfPassed ? 'PASSED' : 'FAILED'}`);
console.log(`ReDoS Mitigation: ${redosPassed ? 'PASSED' : 'FAILED'}`);
console.log(`Max Length Configuration: ${maxLengthPassed ? 'PASSED' : 'FAILED'}`);
if (ssrfPassed && redosPassed && maxLengthPassed) {
  console.log('ALL TESTS PASSED SUCCESSFULLY.');
} else {
  console.log('SOME TESTS FAILED.');
}
