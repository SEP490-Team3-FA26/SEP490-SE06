const fs=require('fs');
const path=require('path');
const sharp=require('C:/Users/loi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=path.resolve(__dirname,'pm-visuals');
fs.mkdirSync(out,{recursive:true});
const C={blue:'#3E5E9E',navy:'#18335B',teal:'#087F82',ink:'#233A55',muted:'#62758D',line:'#D8E2EE',pale:'#EDF3FA',gold:'#9B690F'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const text=(x,y,s,size=34,color=C.ink,weight=400,anchor='start')=>'<text x="'+x+'" y="'+y+'" font-family="Arial, sans-serif" font-size="'+size+'" fill="'+color+'" font-weight="'+weight+'" text-anchor="'+anchor+'">'+esc(s)+'</text>';
const lines=(x,y,arr,size=32,color=C.ink,weight=400,gap=46)=>arr.map((s,i)=>text(x,y+i*gap,s,size,color,weight)).join('');
const rect=(x,y,w,h,fill=C.pale,rx=0,stroke='none')=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+fill+'" stroke="'+stroke+'"/>';
const line=(x1,y1,x2,y2,stroke=C.line,width=2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+stroke+'" stroke-width="'+width+'"/>';
const arrow=(d,color=C.blue)=>'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="4" marker-end="url(#arrow)"/>';
function base(title,body,note){
return '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="'+C.blue+'"/></marker></defs>'+rect(0,0,1920,1080,'white')+rect(96,64,1728,104,C.blue,52)+text(152,132,title,42,'white',700)+body+line(96,990,1824,990)+text(96,1030,note,24,C.muted)+'</svg>';
}
const docs=[];
function add(name,title,svg,caption){docs.push({name,title,svg,caption});fs.writeFileSync(path.join(out,name+'.svg'),svg);}
let b='';
const goals=[
['01','Product scope',['Support pharmacy operations','across procurement, inventory,','sales and pharmacist-assisted AI.']],
['02','Phase 2 delivery',['Implement the agreed scope','and address the feedback','received in Review 1.']],
['03','Project control',['Keep Jira, sprint plans and','project reports consistent.','Assign clear task ownership.']],
['04','Quality and evidence',['Validate critical workflows.','Link requirements to code,','test results and demo evidence.']]
];
goals.forEach((g,i)=>{const x=96+(i%2)*888,y=250+Math.floor(i/2)*290;b+=text(x,y,g[0],54,C.teal,700)+text(x+105,y,g[1],38,C.navy,700)+lines(x+105,y+66,g[2],32,C.ink,400,48)+line(x+105,y+215,x+806,y+215);});
add('01-project-objectives','Project Objectives',base('Project Objectives',b,'Proposed presentation content. Confirm objectives against the approved project scope.'),'Dùng cho slide mục tiêu. Đối chiếu lại phạm vi và tiêu chí hoàn thành đã được nhóm chốt.');
b=text(96,232,'Project milestones',36,C.navy,700);
const phases=[
{x:110,t:'Phase 1',h:'Scope and architecture',d:['Requirements baseline','Initial design'],m:'Review 1'},
{x:708,t:'Phase 2',h:'Core delivery and validation',d:['Implement agreed workflows','Integrate and test'],m:'Review 2'},
{x:1306,t:'Phase 3',h:'Completion and handover',d:['Resolve remaining defects','Regression tests and handover'],m:'Final review'}
];
b+=line(170,310,1750,310,C.blue,5);
phases.forEach((p,i)=>{b+='<circle cx="'+(p.x+36)+'" cy="310" r="17" fill="'+C.teal+'"/>'+text(p.x,280,p.t,29,C.teal,700)+text(p.x,377,p.h,32,C.navy,700)+lines(p.x,426,p.d,28,C.ink,400,42)+text(p.x,543,'Dates: [from Jira]',29,C.gold,700)+text(p.x,590,p.m,29,C.blue,700);if(i<2)b+=line(p.x+530,360,p.x+530,606);});
b+=line(96,650,1824,650)+text(96,718,'Resources',36,C.navy,700);
const resources=[{x:96,h:'4 members',d:['Update task ownership','after the team-size change.']},{x:540,h:'Jira and GitHub',d:['Sprint plans and tasks','Code review and traceability']},{x:984,h:'Web, mobile, backend',d:['Implementation','Integration and testing']},{x:1428,h:'Deployed website',d:['abcpharmacy.store','Demo environment']}];
resources.forEach(r=>{b+=text(r.x,788,r.h,29,C.teal,700)+lines(r.x,836,r.d,26,C.ink,400,40)});
add('02-timeline-resources','Project Timeline and Resources',base('Project Timeline and Resources',b,'Planning template. Replace dates and phases with the actual Jira and Report 2 timeline.'),'Đây là mẫu timeline, chưa phải timeline đã xác minh. Thay [from Jira] bằng ngày thật, điều chỉnh giai đoạn theo Report 2.');
b=text(96,235,'Proposed ownership for the current four-member team',32,C.muted);
b+=rect(96,278,1728,64,C.pale)+text(122,320,'Member',28,C.navy,700)+text(590,320,'Primary focus',28,C.navy,700)+text(1160,320,'Main responsibilities',28,C.navy,700);
const members=[
['Trần Hồng Phước','Architecture and POS',['Architecture, infrastructure,','POS and prescription OCR']],
['Nguyễn Tiến Đạt','Warehouse and inventory',['Inventory workflows, storage','locations and mobile improvements']],
['Nguyễn Văn Nam','Procurement and analytics',['RFQ, demand forecasting,','RFM and reconciliation']],
['Đinh Anh Phúc','AI and quality',['Chatbot/RAG, HR workflows,','IoT integration and QA']]
];
members.forEach((r,i)=>{let y=394+i*126;b+=text(122,y+10,r[0],31,C.navy,700)+text(590,y+10,r[1],29,C.teal,700)+lines(1160,y-6,r[2],28,C.ink,400,42)+line(96,y+69,1824,y+69)});
b+=rect(96,908,1728,58,C.pale)+text(122,948,'Shared work: integration, code review, testing and documentation',29,C.navy,700);
add('03-roles-responsibilities','Roles and Responsibilities',base('Roles and Responsibilities',b,'Draft allocation from the discussion. Confirm owners and supporting members using actual Jira tasks and PRs.'),'Phân công đề xuất dựa trên trao đổi trước. Kiểm tra owner, supporting member và các PR thực tế trước khi trình bày.');
b=text(96,231,'An iterative cycle for selecting, delivering and improving work',32,C.muted);
function block(x,y,w,h,title,detail){return rect(x,y,w,h,'white',0,C.line)+rect(x,y,7,h,C.teal)+text(x+30,y+53,title,34,C.navy,700)+lines(x+30,y+104,detail,27,C.ink,400,39);}
b+=block(96,285,480,180,'Product Backlog',['Ordered product work','aligned with the Product Goal.']);
b+=block(720,285,480,180,'Sprint Planning',['Agree on a Sprint Goal','and select achievable work.']);
b+=block(1344,285,480,180,'Sprint Backlog',['Goal, selected items','and the delivery plan.']);
b+=arrow('M588 375 H706')+arrow('M1212 375 H1330')+arrow('M1584 477 V563');
b+=block(1344,575,480,270,'During the Sprint',['Build, integrate and test.','Daily Scrum: inspect progress','and adapt the work plan.','Output: a usable increment.']);
b+=block(720,575,480,180,'Sprint Review',['Inspect results with stakeholders','and update future work.']);
b+=block(96,575,480,180,'Sprint Retrospective',['Inspect the way the team works','and choose improvements.']);
b+=arrow('M1332 665 H1214')+arrow('M708 665 H590');
b+=arrow('M336 767 V916 H52 V375 H82');
b+=text(570,931,'Feedback and improvements inform the next Sprint',29,C.blue,700);
add('04-scrum-cycle','Software Development Model',base('Software Development Model: Scrum',b,'Conceptual illustration based on the Scrum Guide (scrumguides.org). Add your actual sprint duration.'),'Dùng để giải thích mô hình trước khi nói chi tiết thuật ngữ. Daily Scrum nằm trong Sprint. Ghi thời lượng sprint thực tế khi trình bày.');
b=text(96,230,'Connect each practice to an actual project record',32,C.muted);
b+=rect(96,269,1728,66,C.pale)+text(122,313,'Practice',28,C.navy,700)+text(610,313,'Purpose',28,C.navy,700)+text(1360,313,'Evidence to attach',28,C.navy,700);
const practices=[
['Product Backlog','Keep product work ordered.','Jira backlog'],
['Sprint Planning','Set a goal and select the work.','Sprint Goal and scope'],
['Sprint Backlog','Plan delivery of selected items.','Sprint board'],
['Daily Scrum','Inspect progress and adapt the plan.','Blockers and next actions'],
['Sprint Review','Inspect the outcome with stakeholders.','Demo and feedback notes'],
['Sprint Retrospective','Improve team effectiveness.','Improvement action log']
];
practices.forEach((r,i)=>{let y=389+i*88;b+=text(122,y,r[0],30,C.navy,700)+text(610,y,r[1],28,C.ink)+text(1360,y,r[2],27,C.teal,700)+line(96,y+30,1824,y+30)});
b+=text(96,960,'Use real records from one Sprint to explain the complete cycle.',29,C.blue,700);
add('05-scrum-practices-evidence','Scrum Practices and Evidence',base('Scrum Practices in Our Project',b,'Suggested evidence only. Attach actual records. Scrum concepts: scrumguides.org/scrum-guide.html.'),'Dùng cùng ảnh Jira và ghi chú cuộc họp thật. Tên các evidence là gợi ý, chưa xác nhận nhóm đã có đủ.');

(async()=>{
 for(const d of docs){await sharp(Buffer.from(d.svg)).png().toFile(path.join(out,d.name+'.png'));}
 const thumbW=768,thumbH=432,gap=32;
 const comps=[];
 for(let i=0;i<docs.length;i++){const bytes=await sharp(Buffer.from(docs[i].svg)).resize(thumbW,thumbH).png().toBuffer();comps.push({input:bytes,left:gap+(i%2)*(thumbW+gap),top:gap+Math.floor(i/2)*(thumbH+gap)});}
 await sharp({create:{width:2*thumbW+3*gap,height:3*thumbH+4*gap,channels:4,background:'#DFE8F4'}}).composite(comps).png().toFile(path.join(out,'preview.png'));
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(docs.map(({svg,...d})=>d),null,2));
 const readme='# PM visuals for Canva\n\nBộ hình thiết kế riêng, nền trắng và màu xanh theo slide đã cung cấp. Nội dung tiếng Anh, PNG 1920x1080 và SVG giữ nét.\n\n'+docs.map(d=>'## '+d.title+'\n- Files: '+d.name+'.png / '+d.name+'.svg\n- '+d.caption+'\n').join('\n')+'\nCác hình là minh họa và mẫu bố cục, không phải ảnh cuộc họp, screenshot Jira hoặc evidence đã hoàn thành. Không chứa ngày, phần trăm hay số sprint tự đặt. Timeline và phân công cần được xác nhận trước khi sử dụng.\n\nNguồn thuật ngữ Scrum: https://scrumguides.org/scrum-guide.html\n\nSlide Scrum Practices: ghép thêm ảnh backlog/sprint board thật từ Jira; Sprint Review cần ghi chú feedback, Sprint Retrospective cần hành động cải tiến có thật.\n';
 fs.writeFileSync(path.join(out,'README.md'),readme);
 const html='<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PM visuals for Canva</title><style>body{font:17px/1.6 Arial;margin:32px auto;max-width:1200px;padding:0 20px;color:#18335B;background:#edf3fa}section{background:white;padding:24px;margin:24px 0;border-radius:12px}img{width:100%;height:auto;border:1px solid #d8e2ee}a{color:#245b9c}h1{font-size:32px}</style><h1>Project Management — Hình minh họa cho Canva</h1><p>Minh họa thiết kế riêng. Cần điền timeline thật và xác nhận phân công. Ảnh PNG 1920 × 1080, kèm SVG.</p>'+docs.map(d=>'<section><h2>'+esc(d.title)+'</h2><p>'+esc(d.caption)+'</p><img src="'+d.name+'.png" alt="'+esc(d.title)+'"><p><a href="'+d.name+'.png" download>Tải PNG</a> / <a href="'+d.name+'.svg" download>Tải SVG</a></p></section>').join('')+'</html>';
 fs.writeFileSync(path.join(out,'index.html'),html);
 console.log(JSON.stringify({directory:out,visuals:docs.length,formats:['SVG','PNG'],size:'1920x1080'}));
})().catch(e=>{console.error(e);process.exit(1)});

