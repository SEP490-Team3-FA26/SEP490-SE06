const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/loi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir = path.join(__dirname, 'testing-review');
fs.mkdirSync(dir, {recursive:true});
// Reported counts transcribed from Canva slide 34, inspected on 18 October 2026.
// These are a presentation snapshot, not results produced by a new test run.
const data = {planned:360, passed:295, failed:2, pending:63, na:0};
const executed = data.passed + data.failed;
if (executed + data.pending + data.na !== data.planned) throw new Error('Count reconciliation failed');
const pct = (a,b) => (100*a/b).toFixed(2)+'%';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const t = (x,y,s,size=28,color='#243C57',weight=400) => `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}">${esc(s)}</text>`;
const r = (x,y,w,h,color,rx=0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" rx="${rx}"/>`;
const line = (x1,y1,x2,y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#D7E1ED" stroke-width="2"/>`;
const colors = ['#16816B','#C34242','#ADB9CC'];
let body = t(100,260,'360 planned test cases',48,'#18365D',700);
body += t(100,307,'8 modules  •  Reported test-case status',28,'#647A94');
let offset = 100;
[data.passed,data.failed,data.pending].forEach((count,i) => {
 const width = 1720*count/data.planned;
 body += r(offset,351,width,64,colors[i]); offset += width;
});
[['295','Passed'],['2','Failed'],['63','Pending']].forEach(([value,label],i) => {
 const x=100+i*590;
 body+=r(x,458,13,65,colors[i]);
 body+=t(x+30,487,value,43,'#18365D',700)+t(x+30,524,label,28,'#526A86');
});
body+=line(100,565,1820,565);
const metrics = [
 [pct(executed,data.planned),'Test execution',`${executed} executed / ${data.planned} planned`],
 [pct(data.passed,executed),'Pass rate',`${data.passed} passed / ${executed} executed`],
 [pct(data.passed,data.planned),'Passed / planned',`${data.passed} passed / ${data.planned} planned`]
];
metrics.forEach(([value,label,formula],i)=>{
 const x=100+i*590;
 body+=t(x,662,value,64,i===1?'#16816B':'#3E5E9E',700);
 body+=t(x,710,label,31,'#18365D',700)+t(x,754,formula,27,'#526A86');
});
body+=line(100,800,1820,800);
body+=t(100,853,'NEXT TESTING PRIORITIES',25,'#3E5E9E',700);
body+=t(100,905,'Retest the 2 failed cases',29,'#243C57',700);
body+=t(690,905,'Complete 63 pending cases',29,'#243C57',700);
body+=t(1280,905,'Link results to evidence',29,'#243C57',700);
body+=t(100,992,'Source: Canva slide 34, accessed 18 Oct 2026. Snapshot only; no new test run.',24,'#6C8098');
body+=t(100,1034,'Execution and pass rates are test-case metrics, not code coverage.',24,'#6C8098');
const header = r(96,48,1728,116,'#3E5E9E',58)+t(146,120,'Capstone Project 2026',35,'white',700)
 +[897,951,1005].map(x=>`<circle cx="${x}" cy="106" r="18" fill="white"/>`).join('')
 +t(1310,120,'Software Testing',38,'white',700);
const full = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">${r(0,0,1920,1080,'white')}${header}${body}</svg>`;
const content = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="855" viewBox="0 195 1920 855">${body}</svg>`;
(async()=>{
 for (const [name,svg] of [['Testing-Summary',full],['Testing-Content',content]]) {
  fs.writeFileSync(path.join(dir,name+'.svg'),svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(dir,name+'.png'));
 }
 fs.writeFileSync(path.join(dir,'reported-metrics.json'),JSON.stringify({...data,executed,executionRate:pct(executed,data.planned),passRate:pct(data.passed,executed),passedOverPlanned:pct(data.passed,data.planned),source:'Canva slide 34',accessed:'2026-10-18',newTestRun:false},null,2));
 console.log('Created testing summary PNG / SVG and content-only variants.');
})().catch(e=>{console.error(e);process.exit(1)});
