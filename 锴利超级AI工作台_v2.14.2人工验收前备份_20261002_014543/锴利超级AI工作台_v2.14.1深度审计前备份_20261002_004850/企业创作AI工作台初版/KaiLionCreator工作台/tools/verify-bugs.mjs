import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await p.setViewport({width:1600,height:1000});
await p.goto('http://127.0.0.1:8477/index.html',{waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,1300));

/* ---------- 缺陷1：工作台视图下按 Delete 不应删画布节点 ---------- */
await p.evaluate(()=>{ window.__klc.setView('canvas');
  const c=window.__klc.canvas; c.sel=new Set([c.nodes[0].id]); c.paintSel(); });
await new Promise(r=>setTimeout(r,300));
const n0 = await p.evaluate(()=>window.__klc.canvas.nodes.length);
const s0 = await p.evaluate(()=>window.__klc.canvas.sel.size);
await p.evaluate(()=>window.__klc.setView('workbench'));
await new Promise(r=>setTimeout(r,300));
await p.evaluate(()=>document.body.focus());
await p.keyboard.press('Delete');
await p.keyboard.press('Backspace');
await new Promise(r=>setTimeout(r,400));
const n1 = await p.evaluate(()=>window.__klc.canvas.nodes.length);
console.log(`[缺陷1] 工作台视图按 Delete: 节点 ${n0} → ${n1} (选中${s0})  ${n0===n1?'✅ 未误删':'❌ 被删了'}`);

/* 切回画布后 Delete 应正常生效 */
await p.evaluate(()=>window.__klc.setView('canvas'));
await new Promise(r=>setTimeout(r,300));
await p.evaluate(()=>document.body.focus());
await p.keyboard.press('Delete');
await new Promise(r=>setTimeout(r,400));
const n2 = await p.evaluate(()=>window.__klc.canvas.nodes.length);
console.log(`[缺陷1] 画布视图按 Delete: 节点 ${n1} → ${n2}  ${n2===n1-1?'✅ 正常删除':'❌ 未生效'}`);
await p.evaluate(()=>window.__klc.canvas.undo());
await new Promise(r=>setTimeout(r,300));

/* ---------- 缺陷2：上游文本经 text 端口传入 doc/llm 节点 ---------- */
const flow = await p.evaluate(async ()=>{
  const c=window.__klc.canvas;
  c.loadRaw([],[]);
  const pn={id:'a',type:'promptNode',x:60,y:70,params:{text:'8 英寸中式厨师刀，5Cr15MoV，HRC56，MOQ 1000'}};
  const sp={id:'b',type:'klSpecSheetNode',x:310,y:70,params:{}};
  const ll={id:'c',type:'llmContentNode',x:560,y:70,params:{}};
  const doc={id:'d',type:'wordGeneratorNode',x:810,y:70,params:{}};
  c.nodes=[pn,sp,ll,doc];
  c.wires=[['a','out','b','text'],['b','out','c','prompt'],['a','out','d','in']];
  c.render();
  const {runner}=await import('/js/core/engine.js');
  const outs=await runner.runCanvas(c,{onNode:()=>{}});
  return {
    spec: (outs.b?.preview||outs.b?.text||'').slice(0,80),
    llm: (outs.c?.text||'').slice(0,60),
    word:(outs.d?.preview||'').slice(0,60)
  };
});
console.log('[缺陷2] 规格表节点收到上游文本:', flow.spec.includes('厨师刀')?'✅':'❌', '|', flow.spec.split('\n')[0]);
console.log('[缺陷2] LLM 节点收到上游文本:', flow.llm.includes('厨师刀')?'✅':'❌', '|', flow.llm.replace(/\n/g,' ').slice(0,50));
console.log('[缺陷2] Word 节点收到上游文本:', flow.word.includes('厨师刀')?'✅':'❌', '|', flow.word.split('\n')[0]);

/* ---------- 缺陷3：参数面板的上传/多选按钮已绑定 ---------- */
// 先加载含图片节点的模板（前面被测试用的自定义画布覆盖了）
await p.evaluate(async ()=>{
  const {WORKFLOWS}=await import('/js/data/workflows.js');
  window.__klc.canvas.loadTemplate(WORKFLOWS.find(w=>w.id==='wf-kl-1'));
  window.__klc.setView('canvas');
});
await new Promise(r=>setTimeout(r,600));
// 用 imageInputNode 验证上传按钮行为
const upTest = await p.evaluate(()=>{
  let clicked=0;
  const orig=HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click=function(){ if(this.type==='file') clicked++; else orig.call(this); };
  const c=window.__klc.canvas;
  const img=c.nodes.find(n=>n.type==='imageInputNode');
  if(!img) return -1;
  c.sel=new Set([img.id]); c.paintSel();
  document.querySelector('[data-upload]')?.click();
  HTMLInputElement.prototype.click=orig;
  return clicked;
});
console.log(`[缺陷3] 上传按钮触发文件选择器: ${upTest} 次 ${upTest===1?'✅':'❌'}`);

const multiTest = await p.evaluate(()=>{
  const c=window.__klc.canvas;
  const it={id:'x',type:'detailPageGeneratorNode',x:60,y:70,params:{}};
  c.nodes=[it]; c.wires=[]; c.render();
  c.sel=new Set(['x']); c.paintSel();
  document.querySelector('[data-multi-open]')?.click();
  const open=!!document.querySelector('.modal-mask');
  const title=document.querySelector('.modal-head .mt')?.textContent||'';
  document.querySelector('.modal-mask [data-close]')?.click();
  return {open,title};
});
console.log(`[缺陷3] 多选按钮打开勾选面板: ${multiTest.open} ${multiTest.open?'✅':'❌'} | ${multiTest.title}`);

/* ---------- 缺陷4：定时任务列表刷新 ---------- */
await p.evaluate(async ()=>{
  const {WORKFLOWS}=await import('/js/data/workflows.js');
  window.__klc.canvas.loadTemplate(WORKFLOWS.find(w=>w.id==='wf-kl-1'));
});
await new Promise(r=>setTimeout(r,400));
await p.evaluate(()=>document.querySelector('#tbTasks').click());
await new Promise(r=>setTimeout(r,700));
const t0 = await p.evaluate(()=>document.querySelectorAll('#tkList .wf-item').length);
await p.evaluate(()=>document.querySelector('#tkNew').click());
await new Promise(r=>setTimeout(r,500));
await p.evaluate(()=>{
  const m=[...document.querySelectorAll('.modal-mask')];
  const last=m[m.length-1];
  last.querySelector('#tkName').value='每日选题出图';
  [...last.querySelectorAll('.btn')].find(b=>b.textContent==='创建').click();
});
await new Promise(r=>setTimeout(r,700));
const t1 = await p.evaluate(()=>document.querySelectorAll('#tkList .wf-item').length);
console.log(`[缺陷4] 新建任务后列表刷新: ${t0} → ${t1}  ${t1===t0+1?'✅':'❌'}`);
// 启停
await p.evaluate(()=>document.querySelector('#tkList [data-tog]').click());
await new Promise(r=>setTimeout(r,500));
const label = await p.evaluate(()=>document.querySelector('#tkList .wi-name .tag')?.textContent);
console.log(`[缺陷4] 启停状态刷新: ${label}  ${label==='暂停'?'✅':'❌'}`);
await p.screenshot({path:'/tmp/bugs-tasks.png'});
await p.evaluate(()=>{ const m=document.querySelectorAll('.modal-mask'); m[m.length-1]?.querySelector('[data-close]')?.click(); });

/* ---------- 说明书 ---------- */
await p.evaluate(()=>window.__klc.showManual());
await new Promise(r=>setTimeout(r,900));
console.log('[说明书] 章节', await p.evaluate(()=>document.querySelectorAll('.man-toc-item').length),
  '| 节点行', await p.evaluate(()=>document.querySelectorAll('#ch-5 .man-table tbody tr').length),
  '| 工作流', await p.evaluate(()=>document.querySelectorAll('.man-wfitem').length),
  '| FAQ', await p.evaluate(()=>document.querySelectorAll('#ch-8 .man-faq-item').length));
await p.screenshot({path:'/tmp/bugs-manual.png'});

console.log('\nERRORS:', errs.length, errs.slice(0,6));
await b.close();
