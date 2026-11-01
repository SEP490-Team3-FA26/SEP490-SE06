const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/loi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=path.join(__dirname,'ai-pipeline');fs.mkdirSync(dir,{recursive:true});
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const T=(x,y,s,z=28,c='#243C57',w=400)=>'<text x="'+x+'" y="'+y+'" font-family="Arial, sans-serif" font-size="'+z+'" fill="'+c+'" font-weight="'+w+'">'+esc(s)+'</text>';
const R=(x,y,w,h,c,rx=0,stroke='none')=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+c+'" stroke="'+stroke+'"/>';
const rows=[
 {y:278,c:'#087D8D',p:'#EAF7F8',name:['Prescription','OCR'],n:'01',steps:[
 ['Prescription image',['Printed prescription','JPG / PNG / WEBP']],
 ['Vision OCR',['Extract prescription','fields from images']],
 ['Field validation',['Normalize entries','Detect anomalies']],
 ['Medicine matching',['Match database items','Return warnings']],
 ['Pharmacist review',['Check and adjust','extracted results']]
 ]},
 {y:532,c:'#315FB0',p:'#EEF3FC',name:['Voice','Consultation'],n:'02',steps:[
 ['Consultation audio',['Voice recorded','at the counter']],
 ['Speech-to-text',['Whisper STT','Normalize transcript']],
 ['RAG retrieval',['Medical context','Cohere + Qdrant']],
 ['LLM suggestions',['Generate suggestions','Validate availability']],
 ['Pharmacist review',['Review medicine','choices and warnings']]
 ]},
 {y:786,c:'#7055AD',p:'#F3EFFA',name:['Demand','Forecasting'],n:'03',steps:[
 ['Sales history',['Monthly sales','by medicine']],
 ['Data preparation',['Aggregate and format','sales sequences']],
 ['Demand forecast',['LSTM with fallback','M+1, M+2, M+3']],
 ['Replenishment rules',['Stock + incoming stock','Safety stock / thresholds']],
 ['Management review',['Suggested quantities','and shortage priorities']]
 ]}
];
let body='';
body+=T(340,229,'INPUT',23,'#75869B',700)+T(640,229,'AI PROCESSING AND VALIDATION',23,'#75869B',700)+T(1540,229,'HUMAN REVIEW',23,'#75869B',700);
for(const row of rows){
const y=row.y;
body+=T(100,y+20,row.n,27,row.c,700);
row.name.forEach((a,i)=>body+=T(100,y+66+i*42,a,32,'#18365D',700));
for(let i=0;i<5;i++){
 const x=340+i*300;
 body+=R(x,y-16,260,178,row.p,14)+R(x,y-16,260,7,row.c,3);
 // Wrap the longer titles deliberately to keep all type legible.
 const title=row.steps[i][0], desc=row.steps[i][1];
 const wrap={'Prescription image':['Prescription','image'],'Consultation audio':['Consultation','audio'],'Medicine matching':['Medicine','matching'],'Pharmacist review':['Pharmacist','review'],'Data preparation':['Data','preparation'],'Replenishment rules':['Replenishment','rules'],'Management review':['Management','review']};
 const tt=wrap[title]||[title];
 tt.forEach((a,j)=>body+=T(x+20,y+27+j*33,a,29,row.c,700));
 const sy=tt.length===2?y+105:y+91;
 desc.forEach((a,j)=>body+=T(x+20,sy+j*31,a,23,'#2E455F'));
 if(i<4){let ax=x+270;body+='<path d="M'+ax+' '+(y+75)+' H'+(ax+19)+'" stroke="'+row.c+'" stroke-width="3" fill="none"/><path d="M'+(ax+14)+' '+(y+69)+' L'+(ax+23)+' '+(y+75)+' L'+(ax+14)+' '+(y+81)+'" stroke="'+row.c+'" stroke-width="3" fill="none"/>';}
}
if(row.n!=='03')body+='<line x1="100" y1="'+(y+210)+'" x2="1800" y2="'+(y+210)+'" stroke="#DCE5EF" stroke-width="2"/>';
}
body+=T(100,1002,'Clinical outputs and adjustments feed the OCR / consultation audit history.',25,'#4B6480');
body+=T(100,1042,'Conceptual overview. Pharmacist confirmation enforcement and forecast data mapping remain under validation.',22,'#718297');
const header=R(96,48,1728,116,'#3E5E9E',58)+T(146,120,'Capstone Project 2026',35,'white',700)+'<circle cx="897" cy="106" r="18" fill="white"/><circle cx="951" cy="106" r="18" fill="white"/><circle cx="1005" cy="106" r="18" fill="white"/>'+T(1270,120,'AI Processing Pipeline',36,'white',700);
const full='<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">'+R(0,0,1920,1080,'white')+header+body+'</svg>';
const content='<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="855" viewBox="0 195 1920 855">'+body+'</svg>';
fs.writeFileSync(path.join(dir,'AI-Pipeline-3-Modules.svg'),full);
fs.writeFileSync(path.join(dir,'AI-Pipeline-Content.svg'),content);
(async()=>{
 await sharp(Buffer.from(full)).png().toFile(path.join(dir,'AI-Pipeline-3-Modules.png'));
 await sharp(Buffer.from(content)).png().toFile(path.join(dir,'AI-Pipeline-Content.png'));
 fs.writeFileSync(path.join(dir,'README.md'),'# AI Processing Pipeline\n\nFull slide: AI-Pipeline-3-Modules.png / .svg (1920 x 1080).\nContent only: AI-Pipeline-Content.png / .svg (1920 x 855, transparent background) for inserting below the existing Canva header.\n\nThree lanes: Prescription OCR, Voice Consultation, Demand Forecasting.\nThe labels at the top summarize presentation stages; RAG belongs to processing, while STT and data preparation prepare the respective inputs.\n\nThis is a conceptual illustration, not a screenshot or runtime verification. The actual clinical service currently needs pharmacist confirmation enforcement; forecasting needs salesHistory / sales_history mapping alignment. These limits are noted in the image.\n\nNo forecast accuracy, GPU training claim or live test result is implied. Forecasting outputs support a human replenishment decision; they do not automatically place an approved purchase order.\n');
 console.log('Created 2 PNG and 2 SVG pipeline assets in '+dir);
})().catch(e=>{console.error(e);process.exit(1)});

