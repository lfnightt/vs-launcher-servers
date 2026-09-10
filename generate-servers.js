#!/usr/bin/env node
/**
 * generate-servers.js
 *
 * از API وی‌ام‌پی لیست سرورها رو میگیره و به فرمت JSON لانچر (RemoteList) تبدیل میکنه
 * و در فایل servers.json ذخیره میکنه.
 *
 * اجرا:
 *   node generate-servers.js
 *
 * خروجی: servers.json (همون پوشه)
 *
 * این فایل فقط در GitHub Actions اجرا میشه، نه روی GitHub Pages.
 * GitHub Pages فقط فایل استاتیک سرو میکنه.
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VMP_API = 'https://api.vmp.ir/server/list/list.json';

// پیشوند IPهای ایران برای تشخیص کشور
const IR_PREFIXES = [
  '5.57', '5.42', '5.22', '5.160', '5.121', '5.126', '5.113', '5.116',
  '5.119', '5.232', '5.239', '81.12', '85.133', '87.107', '87.237',
  '87.248', '92.42', '93.117', '95.38', '151.239', '185.26', '194.156',
  '195.18', '212.80', '212.33', '217.18', '31.7', '31.40', '31.56',
  '37.202', '62.3', '62.220', '86.55', '103.195', '113.203', '185.83',
  '2.147', '2.185', '2.188', '2.191', '5.10', '91.107', '46.51', '46.143',
];

function detectCountry(endpoint) {
  if (!endpoint) return null;
  const ip = endpoint.replace(/https?:\/\//, '').split(':')[0];
  for (const prefix of IR_PREFIXES) {
    if (ip.startsWith(prefix)) return 'IR';
  }
  return null;
}

function strip(str) {
  return (str || '').replace(/\^[\d]/g, '');
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('JSON invalid: ' + e.message));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const outFile = path.join(__dirname, 'servers.json');

  console.log('Fetching VMP servers from ' + VMP_API + ' ...');

  const vmpServers = await fetchJson(VMP_API);

  if (!Array.isArray(vmpServers)) {
    console.error('Error: API did not return an array.');
    process.exit(1);
  }

  console.log('Got ' + vmpServers.length + ' servers.');

  const servers = vmpServers
    .filter((s) => {
      return s.connectEndPoints && s.connectEndPoints.length > 0;
    })
    .map((s) => {
      const endpoint = s.connectEndPoints[0] || '';
      const code = endpoint.replace(/https?:\/\//, '');
      const name = strip(s.vars?.sv_projectName || s.hostname || 'Unknown');
      const country = detectCountry(code);
      const boost = Math.min(s.upvotePower || 0, 100);
      const featured = !!s.premium || (s.clients || 0) >= 100;

      return {
        code: code,
        name: name,
        boost: boost,
        info: s,
        vpn_exclude_ip: null,
        country: country,
        featured: featured,
      };
    })
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (a.boost !== b.boost) return b.boost - a.boost;
      const ac = a.info?.clients || 0;
      const bc = b.info?.clients || 0;
      return bc - ac;
    });

  const output = {
    enabled: true,
    servers: servers,
  };

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf-8');
  console.log('Written ' + servers.length + ' servers to ' + outFile);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
