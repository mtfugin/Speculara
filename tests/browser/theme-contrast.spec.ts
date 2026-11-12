import {test, expect} from '@playwright/test';
function luminance(c:number[]) { return c.map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0); }
function contrast(a:number[],b:number[]) { const x=luminance(a), y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
test('primary buttons keep readable labels in every interaction state',async({page})=>{
 await page.goto('/', {waitUntil:'domcontentloaded'});
 await page.getByRole('button', {name:'Try synthetic demo data'}).click();
 await expect(page.getByRole('region', {name:'Dataset summary'})).toContainText('42 rows', {timeout:30000});
 await page.getByRole('button', {name:'Open chat',exact:true}).click();
 const buttons=await page.locator('.btn-primary:visible').all();
 expect(buttons.length).toBeGreaterThanOrEqual(1);
 const rgb=(s:string)=>s.match(/[\d.]+/g)!.slice(0,3).map(Number);
 for(const button of buttons) {
 for(const state of ['default','hover','focus','active']) {
  await page.mouse.move(0,0);
  if(state==='hover'||state==='active') await button.hover();
  if(state==='focus') { await page.keyboard.press('Tab'); await button.focus(); }
  if(state==='active') await page.mouse.down();
  await page.waitForTimeout(300); // let the colour transition settle before measuring
  const c=await button.evaluate(el=>{const s=getComputedStyle(el);return {fg:s.color,bg:s.backgroundColor,outline:s.outlineStyle,focus:el.matches(':focus-visible'),active:el.matches(':active')};});
  expect(contrast(rgb(c.fg),rgb(c.bg)),`${state}: ${c.bg}`).toBeGreaterThanOrEqual(7);
  if(state==='focus') { expect(c.focus).toBe(true); expect(c.outline).toBe('solid'); }
  if(state==='active') expect(c.active).toBe(true);
  if(state==='active') { await page.mouse.move(0,0); await page.mouse.up(); }
 }
 }
});
test('focus survives outline-none and sky outline utilities; secondary meets AAA',async({page})=>{
 await page.goto('/', {waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{const b=document.createElement('button');b.id='focus-probe';b.className='outline-none focus-visible:outline-sky';b.textContent='Focus probe';document.body.append(b);});
 await page.locator('#focus-probe').focus();
 const sample=await page.locator('#focus-probe').evaluate(el=>{const s=getComputedStyle(el);return {style:s.outlineStyle,width:s.outlineWidth,color:s.outlineColor,surface:getComputedStyle(document.body).backgroundColor};});
 expect(sample.style).toBe('solid');expect(parseFloat(sample.width)).toBeGreaterThanOrEqual(3);
 const rgb=(s:string)=>s.match(/[\d.]+/g)!.slice(0,3).map(Number);
 expect(contrast(rgb(sample.color),rgb(sample.surface))).toBeGreaterThanOrEqual(3);
 const secondary=await page.locator('.text-slate-600').first().evaluate(el=>getComputedStyle(el).color);
 expect(contrast(rgb(secondary),rgb(sample.surface))).toBeGreaterThanOrEqual(7);
});

test('reduced motion disables animations and transitions',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/', {waitUntil:'domcontentloaded'});
 const motion=await page.getByRole('button',{name:'Open chat',exact:true}).evaluate(el=>{const s=getComputedStyle(el);return {t:parseFloat(s.transitionDuration),a:s.animationName};});
 expect(motion.t).toBeLessThan(0.001);
 expect(motion.a).toBe('none');
});

test('first focusable control has a visible composited focus ring and the locked module cards are disabled',async({page})=>{
 await page.goto('/', {waitUntil:'domcontentloaded'});
 const list=page.getByRole('list',{name:'Questions'});
 const target=page.locator('#upload');
 await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.timeline===document.timeline&&a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished))); // entrance animations change opacity
 await page.keyboard.press('Tab');
 await target.focus();
 const sample=await target.evaluate(el=>{
  const style=getComputedStyle(el);
  let opacity=1;
  for(let node:Element|null=el;node;node=node.parentElement) opacity*=Number(getComputedStyle(node).opacity);
  return {focus:el.matches(':focus-visible'),outline:style.outlineColor,outlineStyle:style.outlineStyle,opacity,surface:getComputedStyle(document.body).backgroundColor};
 });
 expect(sample.focus).toBe(true);
 expect(sample.outlineStyle).toBe('solid');
 const rgb=(s:string)=>s.match(/[\d.]+/g)!.slice(0,3).map(Number);
 const surface=rgb(sample.surface);
 const composite=rgb(sample.outline).map((v,i)=>v*sample.opacity+surface[i]*(1-sample.opacity));
 const ratio=contrast(composite,surface);
 console.log('initial list focus', {...sample,composite,ratio});
 expect(ratio).toBeGreaterThanOrEqual(3);
 const buttons=await list.getByRole('button').all();
 expect(buttons).toHaveLength(6);
 for(const button of buttons) {
  await expect(button).toBeDisabled();
  expect(await button.evaluate(el=>Number(getComputedStyle(el).opacity))).toBeLessThan(1);
 }
});
