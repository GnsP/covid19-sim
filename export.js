const fs = require('fs');
let s = fs.readFileSync('/dev/stdin').toString();

let data = s.split('---').map(chunk => chunk.replace(/(^\s+)|(\s+$)/g, '')).filter(chunk => !!chunk).reduce((acc, statedata) => {
  statedata.split('\n')
  .map(line => line.replace(/(^\s+)|(\s+$)/g, '')).filter(line => !!line)
  .forEach(line => {
    let ws = line.split(' ');
    let st = ws.slice(0, -2).join(' ');
    if(!acc[st]) acc[st] = [];
    acc[st].push(Number(ws[ws.length-2]));
    acc[st].push(Number(ws[ws.length-1]));
    return;
  });
  return acc;
}, {});

console.log(JSON.stringify(data, (k, v) => {
  if (v instanceof Array) return JSON.stringify(v).replace(/,/g, ', ');
  return v;
}, 2).replace(/\"\[/g, '[').replace(/\]\"/g, ']'));
