// Optional storefront motion. The final state is always the default HTML/CSS.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const narrow=matchMedia('(max-width: 700px)');
const easing='cubic-bezier(.2,.7,.2,1)';
const pending=new Map(),playedRows=new Set(),playedSections=new Set(),animations=new Map();
let restored=false,homeArrival;

function stop(element){
 const animation=animations.get(element);
 if(animation){animations.delete(element);animation.cancel();}
}
function move(element,frames,options){
 stop(element);
 if(reduced.matches||typeof element.animate!=='function')return null;
 const animation=element.animate(frames,{easing,...options});
 animations.set(element,animation);
 animation.finished.catch(()=>{}).finally(()=>{if(animations.get(element)===animation)animations.delete(element);});
 return animation;
}
function anchorTarget(){
 if(!location.hash)return null;
 try{return document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch{return null;}
}
function related(element,target){return target&&(element.contains(target)||target.contains(element));}
const sectionKey=element=>element.dataset.storeSection||element;
function unwatch(element){pending.delete(element);observer?.unobserve(element);}
function finish(element){
 const entry=pending.get(element);
 if(entry?.row)playedRows.add(entry.row);
 else if(entry)playedSections.add(sectionKey(element));
 unwatch(element);
}
function skip(element){return reduced.matches||restored||related(element,anchorTarget())||element.contains(document.activeElement)||document.querySelector('dialog[open]');}
function finishWithin(target){
 for(const element of pending.keys())if(related(element,target))finish(element);
 for(const element of animations.keys())if(related(element,target))stop(element);
}
function revealRow(container,selector){
 const bounds=container.getBoundingClientRect();
 const cards=[...container.querySelectorAll(selector)].filter(card=>!card.closest('[inert],[aria-hidden="true"],[hidden]'));
 const visible=cards.map(card=>({card,box:card.getBoundingClientRect()})).filter(({box})=>box.width&&box.height&&box.bottom>Math.max(0,bounds.top)&&box.top<Math.min(innerHeight,bounds.bottom)&&box.right>Math.max(0,bounds.left)&&box.left<Math.min(innerWidth,bounds.right));
 if(!visible.length)return false;
 const top=Math.min(...visible.map(({box})=>box.top));
 visible.filter(({box})=>Math.abs(box.top-top)<8).sort((a,b)=>a.box.left-b.box.left).slice(0,3).forEach(({card},index)=>{
  move(card,[{opacity:.65,transform:`translateY(${narrow.matches?4:8}px)`},{opacity:1,transform:'translateY(0)'}],{duration:400,delay:narrow.matches?0:Math.min(index*60,120),fill:'backwards'});
 });
 return true;
}
const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
 for(const {target,isIntersecting} of entries){
  const entry=pending.get(target);
  if(!entry)continue;
  if(!target.isConnected){unwatch(target);continue;}
  if(!isIntersecting)continue;
  if(skip(target)){finish(target);continue;}
  if(entry.row){if(revealRow(target,entry.selector))finish(target);continue;}
  finish(target);
  move(target,[{opacity:.55,transform:`translateY(${narrow.matches?8:14}px)`},{opacity:1,transform:'translateY(0)'}],{duration:450});
 }
},{threshold:0}):null;

export function watchSections(root=document){
 if(!observer)return;
 for(const element of pending.keys())if(!element.isConnected)unwatch(element);
 for(const element of root.querySelectorAll('[data-store-section]')){
  if(playedSections.has(sectionKey(element))||pending.has(element))continue;
  pending.set(element,{});if(skip(element))finish(element);else observer.observe(element);
 }
}
export function watchFirstProductRow(container,row,selector){
 if(!observer||!container||playedRows.has(row)||!container.querySelector(selector))return;
 for(const [element,entry] of pending)if(entry.row===row&&element!==container)unwatch(element);
 pending.set(container,{row,selector});
 if(skip(container))finish(container);
 else {observer.unobserve(container);observer.observe(container);}
}
export function animateBasketPanel(element){
 return move(element,[{opacity:.7,transform:narrow.matches?'translateY(10px)':'translateX(16px)'},{opacity:1,transform:'translate(0,0)'}],{duration:250});
}

watchSections();
const home=document.querySelector('#home-box-viewport');
if(observer&&home&&!reduced.matches){
 const watchHome=()=>{
  if(!home.querySelector('[data-home-box]'))return;
  homeArrival?.disconnect();watchFirstProductRow(home,'home','[data-home-box]');
 };
 if('MutationObserver' in window){homeArrival=new MutationObserver(watchHome);homeArrival.observe(home,{childList:true,subtree:true});}
 watchHome();
}
document.addEventListener('focusin',event=>finishWithin(event.target));
document.addEventListener('click',event=>{
 const link=event.target.closest?.('a[href^="#"]');
 if(!link)return;
 try{finishWithin(document.getElementById(decodeURIComponent(link.hash.slice(1))));}catch{}
});
window.addEventListener('hashchange',()=>finishWithin(anchorTarget()));
window.addEventListener('pagehide',()=>{homeArrival?.disconnect();finishWithin(document.documentElement);});
window.addEventListener('pageshow',event=>{if(event.persisted){restored=true;finishWithin(document.documentElement);}});
reduced.addEventListener?.('change',()=>{if(reduced.matches){homeArrival?.disconnect();finishWithin(document.documentElement);}});
