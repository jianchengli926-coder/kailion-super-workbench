import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await p.setViewport({width:1600,height:1000});
await p.goto('http://127.0.0.1:8477/index.html',{waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,1300));

console.log('侧边栏底部项:', await p.evaluate(()=>[...document.querySelectorAll('#sbPinned .sb-item')].map(e=>e.textContent.replace(/\s+/g,' ').trim())));

await p.click('#sbManual');
await new Promise(r=>setTimeout(r,900));

console.log('说明书断言:', JSON.stringify(await p.evaluate(()=>{
  const mb=document.querySelector('#manBody');
  return {
    mounted: !!document.querySelector('.manual'),
    chapters: document.querySelectorAll('.man-toc-item').length,
    sections: document.querySelectorAll('.man-sec').length,
    recipeBlocks: document.querySelectorAll('.man-recipe').length,
    nodeTables: document.querySelectorAll('.man-table').length,
    nodeRows: document.querySelectorAll('.man-table tbody tr').length,
    wfItems: document.querySelectorAll('.man-wfitem').length,
    faq: document.querySelectorAll('.man-faq-item').length,
    keyRows: document.querySelectorAll('.man-keyrow').length,
    metrics: document.querySelectorAll('.man-metrics b').length,
    bodyH: mb.scrollHeight,
    viewActive: !!document.querySelector('.sb-item-help.on')
  };
}),null,1));

await p.screenshot({path:'/tmp/man1.png'});

// 滚到底部
await p.evaluate(()=>{ const mb=document.querySelector('#manBody'); mb.scrollTop=mb.scrollHeight; });
await new Promise(r=>setTimeout(r,700));
await p.screenshot({path:'/tmp/man2.png'});

// 章节跳转
await p.evaluate(()=>{ document.querySelector('[data-go="ch-5"]').click(); });
await new Promise(r=>setTimeout(r,900));
console.log('跳转后 active:', await p.evaluate(()=>document.querySelector('.man-toc-item.on')?.textContent.trim()));
await p.screenshot({path:'/tmp/man3.png'});

// FAQ 展开
await p.evaluate(()=>{ document.querySelector('[data-go="ch-8"]').click(); });
await new Promise(r=>setTimeout(r,800));
await p.evaluate(()=>{ document.querySelectorAll('.man-faq-q')[0].click(); });
await new Promise(r=>setTimeout(r,300));
console.log('FAQ 展开:', await p.evaluate(()=>document.querySelectorAll('.man-faq-item.open').length));
await p.screenshot({path:'/tmp/man4.png'});

// 搜索
await p.evaluate(()=>{ const q=document.querySelector('#manQ'); q.value='供应商'; q.dispatchEvent(new Event('input',{bubbles:true})); });
await new Promise(r=>setTimeout(r,600));
console.log('搜索命中:', await p.evaluate(()=>document.querySelectorAll('#manBody mark').length));
await p.screenshot({path:'/tmp/man5.png'});

// 说明书里加载工作流
await p.evaluate(()=>{ const q=document.querySelector('#manQ'); q.value=''; q.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('[data-go="ch-6"]').click(); });
await new Promise(r=>setTimeout(r,700));
const before = await p.evaluate(()=>window.__klc.canvas.nodes.length);
await p.evaluate(()=>{ document.querySelector('.man-wfitem [data-loadwf]').click(); });
await new Promise(r=>setTimeout(r,800));
console.log('从说明书加载工作流:', before, '→', await p.evaluate(()=>window.__klc.canvas.nodes.length), '| view=', await p.evaluate(()=>window.__klc.view));

console.log('ERRORS:', errs.length, errs.slice(0,5));
await b.close();
