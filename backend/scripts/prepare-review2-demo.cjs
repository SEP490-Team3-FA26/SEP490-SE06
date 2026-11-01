/*
 * Review 2 demo fixtures, exclusively through the authorized abcpharmacy.store API.
 * No MongoDB credentials, no .env loading, no email/SMS, no actual payment calls.
 * inspect: read back only DEMO R2 catalog/RFQ records; prepare: add namespaced fixtures.
 */
const fs=require('fs'),path=require('path');
const BASE='https://abcpharmacy.store';
const mode=process.argv[2]||'inspect';
if(!['inspect','prepare','verify','normalize-units'].includes(mode))throw new Error('Use inspect, prepare, verify, or normalize-units');
const out=path.resolve(__dirname,'../../docs/presentation/demo-data');
fs.mkdirSync(out,{recursive:true});
let token;
const id=o=>String(o?._id||o?.id||'');
const unwrap=o=>o?.data??o;
const array=o=>{const v=unwrap(o);return Array.isArray(v)?v:(v?.items||v?.medicines||v?.suppliers||[])};
const log=(event,fields={})=>console.log(JSON.stringify({event,...fields}));
async function call(method,route,payload){
 if(!route.startsWith('/api/')||/\/(send|payment|payments|payos|checkout|retrain)(\/|$)/i.test(route))throw new Error('Route outside demo preparation scope');
 const r=await fetch(BASE+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(payload===undefined?{}:{body:JSON.stringify(payload)}),signal:AbortSignal.timeout(20000)});
 const raw=await r.text();let data;
 if(!raw.trim()&&r.ok)data={accepted:true,httpStatus:r.status,emptyResponse:true};
 else try{data=JSON.parse(raw)}catch{if(r.ok&&method!=='GET'){log('write_acknowledged_non_json',{method,route,httpStatus:r.status,requiresReadback:true});data={accepted:true,nonJson:true,httpStatus:r.status}}else throw new Error(`Non-JSON response from ${route}: ${r.status}; length=${raw.length}`)}
 if(!r.ok||data?.success===false)throw new Error(`${method} ${route}: ${r.status} ${JSON.stringify(data?.message||'Request failed').slice(0,250)}`);
 return data;
}
async function login(){
 const password=process.env.REVIEW2_DEMO_PASSWORD;
 if(!password)throw new Error('Provide the authorized test-account password in REVIEW2_DEMO_PASSWORD; do not put it in a file.');
 const auth=await call('POST','/api/auth/login',{email:'admin@vinapharmacy.com',password});
 token=auth.access_token||auth.token||auth.data?.access_token||auth.data?.token;
 if(!token)throw new Error('Login returned no usable access token');
 log('application_login_ok',{origin:BASE,mode,tokenPrinted:false});
}
async function inspect(){
 const supplierResponse=await call('GET','/api/suppliers?_t='+Date.now());
 log('supplier_readback',{responseType:typeof supplierResponse,keys:Object.keys(supplierResponse||{}).slice(0,8),demoSuppliers:array(supplierResponse).filter(s=>/^DEMO R2/.test(s.name||'')).map(s=>({id:id(s),name:s.name}))});
 const medicines=array(await call('GET','/api/medicines?search=DEMO%20R2&limit=20&directDb=true')).filter(x=>/^DEMO R2/.test(x.name||''));
 const rfqs=array(await call('GET','/api/rfqs')).filter(x=>/^DEMO R2/.test(x.title||''));
 const result={origin:BASE,accessedAt:new Date().toISOString(),medicines:medicines.map(m=>({_id:id(m),name:m.name,sku:m.sku,price:m.price,stock:m.stock,unit:m.unit,supplierId:m.supplierId,is_medicine:m.is_medicine})),rfqs:rfqs.map(r=>({_id:id(r),rfqCode:r.rfqCode,title:r.title,status:r.status,items:r.items,quotations:(r.quotations||[]).map(q=>({quotationId:q.quotationId,supplierId:q.supplierId,totalAmount:q.totalAmount})),awardedPoId:r.awardedPoId}))};
 fs.writeFileSync(path.join(out,'website-demo-records.json'),JSON.stringify(result,null,2));
 log('scoped_readback',{medicineCount:result.medicines.length,medicines:result.medicines.map(m=>({id:m._id,name:m.name,stock:m.stock})),rfqs:result.rfqs.map(r=>({id:r._id,code:r.rfqCode,status:r.status,quoteCount:r.quotations.length}))});
 return {medicines,rfqs};
}
const manifestPath=path.join(out,'website-demo-manifest.json');
let manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{origin:BASE,label:'DEMO R2',synthetic:true,notForClinicalUse:true,products:[],suppliers:[],receipts:[],events:[]};
function save(){fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));}
function checkpoint(event,fields={}){manifest.events.push({event,...fields,at:new Date().toISOString()});save();log(event,fields)}
function onlyDemo(entity,labelField='name'){if(!String(entity?.[labelField]||'').startsWith('DEMO R2'))throw new Error('Refusing to alter a non-DEMO entity');return entity}
async function listSuppliers(){return array(await call('GET','/api/suppliers?_t='+Date.now()))}
async function readById(route,entityId){const value=array(await call('GET',route+'?_t='+Date.now())).find(x=>id(x)===String(entityId));if(!value)throw new Error('Entity not visible in list readback: '+route+' '+entityId);return value}
async function getMedicine(medicineId){return unwrap(await call('GET','/api/medicines/'+medicineId))}
async function ensureSupplier(suffix){
 const name='DEMO R2 - NCC '+suffix+' - KHONG GIAO DICH THAT';
 let item=(await listSuppliers()).find(s=>s.name===name);
 if(!item){item=unwrap(await call('POST','/api/suppliers',{name,contact_info:`demo-r2-${suffix.toLowerCase()}@example.invalid`,business_registration_number:'DEMO-NOT-A-REAL-BUSINESS',gdp_certificate_number:'DEMO-NOT-A-VALID-CERTIFICATE',gdp_expiry_date:'2028-10-18T00:00:00.000Z',status:'ACTIVE',creditLimit:10000000,paymentTermDays:30}));if(!id(item))item=(await listSuppliers()).find(s=>s.name===name);if(!id(item))throw new Error('Supplier write acknowledged but not visible in application readback; do not retry blindly.');checkpoint('demo_supplier_created',{name,supplierId:id(item)})}
 onlyDemo(item);if(!manifest.suppliers.some(s=>s.id===id(item)))manifest.suppliers.push({id:id(item),name});save();return item;
}
async function ensureProducts(supplierId){
 const specs=[
  {name:'DEMO R2 - Vitamin C 500mg',sku:'DEMO-R2-VITC',price:25000,unit:'Hộp',category:'Vitamin & Khoáng chất',active_ingredient:'Vitamin C - du lieu thu nghiem',zone:'E',qty:110,buyPrice:18000},
  {name:'DEMO R2 - Bong y te 100g',sku:'DEMO-R2-BONG',price:12000,unit:'Gói',category:'Vật tư y tế',active_ingredient:'Bong y te - du lieu thu nghiem',zone:'F',qty:8,buyPrice:8000},
  {name:'DEMO R2 - Khau trang y te',sku:'DEMO-R2-KT',price:30000,unit:'Hộp',category:'Vật tư y tế',active_ingredient:'Vat tu - du lieu thu nghiem',zone:'F',qty:60,buyPrice:20000}
 ];
 const existing=(await inspect()).medicines;
 const result=[];
 for(const spec of specs){
  let med=existing.find(m=>m.name===spec.name);
  if(!med){med=unwrap(await call('POST','/api/medicines',{...spec,supplierId,stock:0,safetyStock:20,reorderPoint:50,manufacturer:'DEMO - Khong phai hang luu thong',drug_classification:'NORMAL',is_medicine:false,national_sync_status:'NOT_REQUIRED',cong_dung:'Du lieu DEMO Review 2, khong dung dieu tri, khong kinh doanh hang that.',cach_dung:'Khong su dung. Chi la du lieu kiem thu phan mem.',tac_dung_phu:'Khong ap dung - du lieu thu nghiem'}));if(!id(med))med=array(await call('GET','/api/medicines?search=DEMO%20R2&limit=20&directDb=true&_t='+Date.now())).find(m=>m.name===spec.name);if(!id(med))throw new Error('Product write not visible in readback');checkpoint('demo_product_created',{name:spec.name,medicineId:id(med)})}
  onlyDemo(med);
  if(med.supplierId!==supplierId){await call('PUT','/api/medicines/'+id(med),{supplierId});checkpoint('demo_product_supplier_linked',{medicineId:id(med)})}
  const product={...spec,id:id(med)};
  result.push(product);
  if(!manifest.products.some(p=>p.id===product.id))manifest.products.push(product);
 }
 save();return result;
}
async function freeLocation(zone){
 const used=new Set(manifest.products.filter(p=>p.location).map(p=>`${p.location.zone}/${p.location.rack}/${p.location.shelf}/${p.location.bin}`));
 for(let n=4;n>=1;n--){
  const rack=zone==='RESERVE'?'RES'+n:zone+n;
  const res=unwrap(await call('GET',`/api/medicines/shelf-layout?zone=${zone}&rack=${rack}`));
  const shelves=Array.isArray(res)?res:(res?.layout||res?.shelves||[]);
  for(const shelf of [...shelves].reverse())for(const bin of [...(shelf.bins||[])].reverse()){
   const slot={zone,rack,shelf:Number(shelf.shelfNo||shelf.shelf),bin:Number(bin.binNo||bin.bin),slotType:zone==='RESERVE'?'RESERVE':'MAIN'};
   if(!slot.shelf||!slot.bin)continue;
   if(!bin.medicineId&&(!bin.currentStock||bin.status==='EMPTY')&&!used.has(`${zone}/${rack}/${slot.shelf}/${slot.bin}`))return slot;
  }
 }
 if(zone!=='RESERVE'){log('preferred_zone_full',{zone,fallback:'Search an unassigned RESERVE slot; never overwrite an existing assignment'});return freeLocation('RESERVE')}
 throw new Error(`No verified empty slot found in reserve; no existing slot will be overwritten.`);
}
async function ensureRfq(products,suppliers){
 const title='DEMO R2 - WORKFLOW mua nhap ban - du lieu thu nghiem';
 let rfq=(await inspect()).rfqs.find(r=>r.title===title);
 if(!rfq){rfq=unwrap(await call('POST','/api/rfqs',{title,deadline:'2026-11-30T16:59:59.000Z',minShelfLifeMonths:2,requiredPaymentTermDays:30,items:products.map(p=>({medicineId:p.id,medicineName:p.name,sku:p.sku,unit:p.unit,quantityRequested:p.qty,targetPrice:p.buyPrice,gppCompliant:false,notes:'DEMO fixture; khong phai ho so tuan thu thuc te'})),targetSuppliers:suppliers.map((s,i)=>({supplierId:id(s),supplierName:s.name,email:`demo-r2-${i}@example.invalid`})),notes:'DEMO R2. Du lieu gia lap da duoc yeu cau de dien tap. Khong gui email, khong giao hang hay thanh toan that. Moc HSD 2 thang chi la tham so thu nghiem.'}));checkpoint('demo_rfq_created',{rfqId:id(rfq),rfqCode:rfq.rfqCode})}
 if(!id(rfq))rfq=array(await call('GET','/api/rfqs?_t='+Date.now())).find(r=>r.title===title);
 if(!id(rfq))throw new Error('DEMO RFQ creation not visible in application readback');
 onlyDemo(rfq,'title');manifest.rfq={id:id(rfq),code:rfq.rfqCode,title};save();
 for(let i=0;i<suppliers.length;i++){
  if(!(rfq.quotations||[]).some(q=>q.supplierId===id(suppliers[i]))){
   await call('POST',`/api/rfqs/${id(rfq)}/quotations`,{supplierId:id(suppliers[i]),supplierName:suppliers[i].name,paymentTermsDays:30,deliveryDays:i?1:2,items:products.map(p=>({medicineId:p.id,medicineName:p.name,quotedPrice:i?Math.round(p.buyPrice*0.85):p.buyPrice,offeredShelfLifeMonths:i?1:3,availableQuantity:p.qty,notes:'DEMO R2 - bao gia gia lap, khong tu NCC that'})),totalAmount:products.reduce((sum,p)=>sum+p.qty*(i?Math.round(p.buyPrice*0.85):p.buyPrice),0),notes:'DEMO R2 - bao gia nhap thu cong phuc vu dien tap; khong giao dich that'});
   checkpoint('demo_quote_created',{rfqId:id(rfq),supplierId:id(suppliers[i]),scenario:i?'cheaper_but_short_expiry':'meets_demo_expiry_parameter'});
   rfq=await readById('/api/rfqs',id(rfq));
  }
 }
 if(!rfq.awardedPoId){
  const chosen=rfq.quotations.find(q=>q.supplierId===id(suppliers[0]));
  if(!chosen)throw new Error('Demo quotation not found');
  await call('POST',`/api/rfqs/${id(rfq)}/award`,{quotationId:chosen.quotationId,supplierId:id(suppliers[0]),reason:'DEMO R2 - chon bao gia dap ung tham so HSD; khong phai quyet dinh mua hang that'});
  rfq=await readById('/api/rfqs',id(rfq));
  checkpoint('demo_rfq_awarded',{rfqId:id(rfq),poId:rfq.awardedPoId});
 }
 if(!rfq.awardedPoId)throw new Error('No PO linked to the DEMO RFQ');
 const po=await readById('/api/purchase-orders',rfq.awardedPoId);
 if(!po.items?.every(i=>products.some(p=>p.id===i.medicineId)))throw new Error('PO includes a non-DEMO item');
 manifest.po={id:id(po),code:po.poCode,status:po.status};save();
 if(po.status==='PENDING_APPROVAL'){
  await call('POST','/api/purchase-orders/approve-pay',{poId:id(po),action:'APPROVE',paymentType:'CREDIT',approvedBy:'DEMO R2 - preparation'});
  checkpoint('demo_po_status_prepared',{poId:id(po),paymentType:'CREDIT',actualPayment:false});
 }
 return id(po);
}
async function receiveGroup(poId,products,group){
 const marker='DEMO-R2-'+group;
 let receiptInfo=manifest.receipts.find(g=>g.marker===marker);
 let grn=receiptInfo?await readById('/api/goods-receipts',receiptInfo.id):null;
 const items=(group==='NEAR'?products.map((p,i)=>({p,qty:i===0?30:p.qty,days:i===0?80:730})):products.filter((_,i)=>i===0).map(p=>({p,qty:80,days:730})));
 if(!grn){
  const payload={poId,receivedBy:'DEMO R2 - kiem nhan thu nghiem',branchId:'CENTRAL_WH',vatInvoiceNumber:marker,items:items.map(({p,qty,days})=>({medicineId:p.id,batchNo:`${p.sku}-${group}`,expDate:new Date(Date.parse('2026-10-18T00:00:00Z')+days*86400000).toISOString(),quantity:qty,unitPrice:p.buyPrice,shelvedLocation:p.location}))};
  grn=unwrap(await call('POST','/api/goods-receipts',payload));
  if(!id(grn))grn=array(await call('GET','/api/goods-receipts?_t='+Date.now())).find(g=>g.poId===poId&&(g.vatInvoiceNumber===marker||g.items?.some(i=>i.batchNo===payload.items[0].batchNo)));
  if(!id(grn))throw new Error('DEMO GRN creation not visible in application readback');
  receiptInfo={id:id(grn),marker,poId,items:payload.items};manifest.receipts.push(receiptInfo);save();checkpoint('demo_grn_created',{grnId:id(grn),marker});
 }
 if(grn.status==='COMPLETED'){log('demo_grn_already_completed',{grnId:id(grn)});return}
 if(grn.status==='INSPECTING'){
  const record=unwrap(await call('POST','/api/goods-receipts/inspections',{grnId:id(grn),inspectedBy:'DEMO R2 - dem tay du lieu thu nghiem'}));
  for(const row of record.items){
   const fixture=receiptInfo.items.find(i=>i.medicineId===row.medicineId);if(!fixture)throw new Error('Unexpected item in DEMO receipt');
   await call('POST','/api/goods-receipts/inspections/verify',{recordId:id(record),itemId:id(row),actualQty:fixture.quantity,batchNo:fixture.batchNo,expDate:fixture.expDate,location:fixture.shelvedLocation});
  }
  await call('POST',`/api/goods-receipts/${id(grn)}/submit-inspection`,{});
 }
 grn=await readById('/api/goods-receipts',id(grn));
 if(grn.status!=='PENDING_APPROVAL')throw new Error('DEMO receipt not ready for approval: '+grn.status);
 await call('POST',`/api/goods-receipts/${id(grn)}/approve`,{});
 checkpoint('demo_grn_approved',{grnId:id(grn),marker,manualFixtureCount:true});
}
async function ensureBranchFixtures(products){
 const product=products[0];
 const branches=array(await call('GET','/api/branches'));
 const branch=branches.find(b=>b.branchCode==='BR-001');
 if(!branch)throw new Error('BR-001 not found; refusing to allocate fixtures to an unverified branch');
 manifest.branch={id:id(branch),code:branch.branchCode,name:branch.name};save();
 if(!manifest.transfers)manifest.transfers=[];
 for(const scenario of [{key:'READY',qty:20,receive:true},{key:'LIVE-RECEIVE',qty:5,receive:false}]){
  let saved=manifest.transfers.find(t=>t.key===scenario.key);
  const reason='DEMO R2 - '+scenario.key+' - chi du lieu dien tap, khong van chuyen hang that';
  if(!saved){
   const prs=array(await call('GET','/api/purchase-requisitions'));
   let pr=prs.find(p=>p.reason===reason&&p.items?.every(i=>i.medicineId===product.id));
   if(!pr){const response=await call('POST','/api/purchase-requisitions',{branchId:branch.branchCode,branchName:branch.name,reason,notes:reason,createdBy:'DEMO R2 preparation',items:[{medicineId:product.id,medicineName:product.name,requestedQuantity:scenario.qty,unit:product.unit}]});pr=unwrap(response);if(!id(pr))pr=array(await call('GET','/api/purchase-requisitions?_t='+Date.now())).find(p=>p.reason===reason);if(!id(pr))throw new Error('DEMO PR missing after creation');checkpoint('demo_branch_pr_created',{prId:id(pr),key:scenario.key})}
   const existing=array(await call('GET','/api/stock-transfers')).find(t=>t.prId===id(pr));
   let transfer=existing;
   if(!transfer){transfer=unwrap(await call('POST','/api/stock-transfers',{prId:id(pr),fromBranchId:'CENTRAL_WH',shippedBy:'DEMO R2 preparation'}));if(!id(transfer))transfer=array(await call('GET','/api/stock-transfers?_t='+Date.now())).find(t=>t.prId===id(pr));if(!id(transfer))throw new Error('DEMO transfer not visible after creation')}
   saved={key:scenario.key,id:id(transfer),code:transfer.transferCode,prId:id(pr),prCode:pr.prCode,quantity:scenario.qty,medicineId:product.id,status:transfer.status,items:transfer.items};manifest.transfers.push(saved);save();checkpoint('demo_stock_transfer_prepared',{transferId:saved.id,code:saved.code,key:scenario.key,quantity:scenario.qty});
  }
  const current=await readById('/api/stock-transfers',saved.id);
  if(scenario.receive&&current.status==='SHIPPING'){
   if(current.items.some(i=>i.medicineId!==product.id))throw new Error('Unexpected product in demo transfer');
   await call('POST',`/api/stock-transfers/${saved.id}/receive`,{receivedBy:'DEMO R2 fixture preparation',inspectionItems:current.items.map(i=>({medicineId:i.medicineId,batchNo:i.batchNo,actualQuantity:i.quantity})),inspectionNote:'DEMO R2 - so lieu thu nghiem, khong phai nhan hang vat ly'});
   checkpoint('demo_branch_receipt_prepared',{transferId:saved.id,quantity:scenario.qty});
  }
  saved.status=(await readById('/api/stock-transfers',saved.id)).status;save();
 }
}
async function prepare(){
 const suppliers=[await ensureSupplier('A'),await ensureSupplier('B')];
 const products=await ensureProducts(id(suppliers[0]));
 for(const p of products){
  const stored=manifest.products.find(x=>x.id===p.id);
  if(!stored.location){stored.location=await freeLocation(p.zone);save()}
  p.location=stored.location;
  if(!stored.locationAssigned){await call('POST','/api/medicines/assign-location',{medicineId:p.id,...p.location,maxCapacity:200});stored.locationAssigned=true;save();checkpoint('demo_location_assigned',{medicineId:p.id,location:p.location})}
 }
 const poId=await ensureRfq(products,suppliers);
 await receiveGroup(poId,products,'NEAR');
 await receiveGroup(poId,products,'FAR');
 await ensureBranchFixtures(products);
 await inspect();
 checkpoint('demo_main_fixtures_prepared',{products:products.length,receipts:manifest.receipts.length});
}
async function verify(){
 const records=await inspect();
 const bins=[];
 for(const product of manifest.products){
  const l=product.location;
  const detail=unwrap(await call('GET',`/api/medicines/bin-detail?zone=${l.zone}&rack=${l.rack}&shelf=${l.shelf}&bin=${l.bin}`));
  bins.push({sku:product.sku,location:l,detail});
 }
 const receipts=[];
 for(const saved of manifest.receipts){const r=await readById('/api/goods-receipts',saved.id);receipts.push({id:id(r),code:r.grnCode,status:r.status,items:r.items})}
 const transfers=[];
 for(const saved of manifest.transfers||[]){const r=await readById('/api/stock-transfers',saved.id);transfers.push({id:id(r),code:r.transferCode,status:r.status,items:r.items,toBranchId:r.toBranchId})}
 const branchMedicines=array(await call('GET',`/api/medicines/branch/${manifest.branch.code}?search=DEMO%20R2&limit=20&branchStockOnly=true`)).filter(m=>manifest.products.some(p=>p.id===id(m))).map(m=>({id:id(m),name:m.name,stock:m.stock,branchStock:m.branchStock,price:m.price,unit:m.unit,units:m.units}));
 const chatbotReference=array(await call('GET','/api/medicines?search=Enervon&limit=20&directDb=true')).map(m=>({id:id(m),name:m.name,stock:m.stock,price:m.price,unit:m.unit}));
 const result={origin:BASE,verifiedAt:new Date().toISOString(),medicines:records.medicines.map(m=>({id:id(m),sku:m.sku,name:m.name,stock:m.stock,price:m.price,unit:m.unit})),receipts,transfers,bins,branchMedicines,chatbotReference};
 fs.writeFileSync(path.join(out,'website-demo-verification.json'),JSON.stringify(result,null,2));
 log('demo_verification_saved',{receipts:receipts.map(r=>({code:r.code,status:r.status})),transfers:transfers.map(t=>({code:t.code,status:t.status}))});
}
async function normalizeUnits(){
 for(const p of manifest.products){
  const m=onlyDemo(await getMedicine(p.id));
  if(m.sku!==p.sku)throw new Error('Fixture SKU mismatch');
  await call('PUT','/api/medicines/'+p.id,{unit:p.unit,boxCapacity:1,units:[{unitName:p.unit,exchangeValue:1,price:p.price,isBaseUnit:true}]});
  checkpoint('demo_unit_normalized',{medicineId:p.id,unit:p.unit,exchangeValue:1});
 }
 await verify();
}
(async()=>{await login();if(mode==='prepare')await prepare();else if(mode==='verify')await verify();else if(mode==='normalize-units')await normalizeUnits();else await inspect()})().catch(e=>{log('stopped',{message:e.message,errorType:e.name,causeCode:e.cause?.code});process.exitCode=1});
