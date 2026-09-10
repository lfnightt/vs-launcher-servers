#!/usr/bin/env node
/**
 * generate-servers.js
 *
 * Fetches the live VMP server list and writes a servers.json file
 * compatible with the QP Launcher's RemoteList format.
 *
 * Usage:
 *   node generate-servers.js
 *   node generate-servers.js --output ../servers.json
 *
 * The output file is meant to be served as a static file from
 * GitHub Pages so the launcher can fetch it at:
 *   https://<user>.github.io/<repo>/servers.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const VMP_API = 'https://api.vmp.ir/server/list/list.json';

// Known Iranian IP prefixes for country detection
const IR_PREFIXES = [
  '5.57', '5.42', '5.22', '5.160', '5.121', '5.126', '5.113', '5.116',
  '5.119', '5.232', '5.239', '81.12', '85.133', '87.107', '87.237',
  '87.248', '92.42', '93.117', '95.38', '151.239', '185.26', '194.156',
  '195.18', '212.80', '212.33', '217.18', '31.7', '31.40', '31.56',
  '37.202', '62.3', '62.220', '86.55', '103.195', '113.203', '185.83',
  '2.147', '2.185', '2.188', '2.191', '2.147', '5.10', '5.121', '5.239',
  '185.83', '91.107', '198.18', '46.51', '46.143',
];

function detectCountry(endpoint) {
  if (!endpoint) return null;
  const ip = endpoint.replace(/https?:\/\//, '').split(':')[0];
  for (const prefix of IR_PREFIXES) {
    if (ip.startsWith(prefix)) return 'IR';
  }
  if (/^(198\.|172\.(1[6-9]|2|3[01])\.|10\.|23\.|34\.|52\.|104\.|142\.|199\.|208\.)/.test(ip)) return 'US';
  return null;
}

function strip(str) {
  return (str || '').replace(/\^[\d]/g, '');
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const outIdx = process.argv.indexOf('--output');
  const outFile = outIdx >= 0 ? process.argv[outIdx + 1] : path.join(__dirname, 'servers.json');

  console.log(`Fetching VMP server list from ${VMP_API} ...`);
  const vmpServers = await fetch(VMP_API);

  if (!Array.isArray(vmpServers)) {
    console.error('Error: VMP API did not return an array.');
    process.exit(1);
  }

  console.log(`Got ${vmpServers.length} servers from VMP.`);

  const servers = vmpServers
    .filter((s) => {
      // Only include servers with at least one connect endpoint
      return s.connectEndPoints && s.connectEndPoints.length > 0;
    })
    .map((s) => {
      const endpoint = s.connectEndPoints[0] || '';
      const code = endpoint.replace(/https?:\/\//, '');
      const name = strip(s.vars?.sv_projectName || s.hostname || 'Unknown');
      const country = s.country || detectCountry(code);
      const boost = Math.min(s.upvotePower || 0, 100);
      const featured = !!s.premium || (s.clients || 0) >= 100;

      return {
        code,
        name,
        boost,
        info: s, // Pass through the full VMP object as enriched info
        vpn_exclude_ip: null,
        country,
        featured,
      };
    })
    // Sort: featured first, then by boost, then by current players
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (a.boost !== b.boost) return b.boost - a.boost;
      const ac = a.info?.clients || 0;
      const bc = b.info?.clients || 0;
      return bc - ac;
    });

  const output = {
    enabled: true,
    servers,
  };

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Written ${servers.length} servers to ${outFile}`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
