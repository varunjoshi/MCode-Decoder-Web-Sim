const fs = require('fs');
const vcd = fs.readFileSync('morse.vcd', 'utf8');
const lines = vcd.split(/\r?\n/);
const cur = {};

for (const line of lines) {
  const l = line.trim();
  if (l.startsWith('#')) {
    const time = parseInt(l.slice(1));
    if (time >= 21300000000 && time <= 21650000000) {
      if (cur['!'] === '1' && l.endsWith('5000000')) {
        console.log('T=' + (time/1000000) + 'ns | raw=' + cur['#'] + ' sync=' + cur['4'] + ' press=' + cur['6'] + ' rel=' + cur['7'] + ' width=' + cur['>'] + ' dash=' + cur['?']);
      }
    }
  } else if (l.startsWith('b')) {
    const parts = l.slice(1).split(/\s+/);
    cur[parts[1]] = parts[0];
  } else if (l.length >= 2) {
    cur[l.slice(1)] = l[0];
  }
}
