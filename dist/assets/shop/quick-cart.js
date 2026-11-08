import {animateBasketPanel} from '../store-motion.js?v=selected-1';

// Move the existing basket into a native dialog. There is never a second cart
// or a separate checkout path, and the original layout slot keeps its height.
export function mountQuickCart(dialog,{getBasket,fallbackTrigger}){
 const shell=dialog?.querySelector('.quick-cart-shell'),body=dialog?.querySelector('.quick-cart-content'),dismiss=dialog?.querySelector('[data-close-quick-cart]');
 let session=null;
 const usable=element=>element?.isConnected&&!element.disabled&&!element.hidden&&element.getClientRects().length;
 function close({restoreFocus=true}={}){
  if(!session)return null;
  const current=session;session=null;current.animation?.cancel();
  if(dialog.open)dialog.close();
  if(current.slot.isConnected)current.slot.replaceWith(current.basket);else current.basket.remove();
  current.opener?.setAttribute('aria-expanded','false');
  const target=usable(current.opener)?current.opener:fallbackTrigger();
  if(restoreFocus&&usable(target))target.focus({preventScroll:true});
  return target;
 }
 function open(opener=document.activeElement){
  if(session&&dialog.open)return true;
  if(session)close({restoreFocus:false});
  const basket=getBasket();
  if(!basket||!shell||!body||!dismiss||typeof dialog.showModal!=='function'||document.querySelector('dialog[open]'))return false;
  const slot=document.createElement('div');slot.className='quick-cart-placeholder';slot.setAttribute('aria-hidden','true');slot.style.height=basket.getBoundingClientRect().height+'px';
  basket.before(slot);body.append(basket);
  session={basket,slot,opener,animation:null};
  try{dialog.showModal();}
  catch{close({restoreFocus:false});return false;}
  opener?.setAttribute('aria-expanded','true');
  dialog.scrollTop=0;dismiss.focus({preventScroll:true});
  session.animation=animateBasketPanel(shell);
  return true;
 }
 function captureFocus(){
  const element=document.activeElement;
  if(!session?.basket.contains(element))return null;
  if(element.id)return '#'+CSS.escape(element.id);
  if(element.hasAttribute('data-qty'))return `[data-qty="${CSS.escape(element.dataset.qty)}"][data-delta="${CSS.escape(element.dataset.delta)}"]`;
  if(element.hasAttribute('data-remove'))return `[data-remove="${CSS.escape(element.dataset.remove)}"]`;
  return '';
 }
 function restoreFocus(selector){
  if(!session||selector===null)return;
  const target=selector&&session.basket.querySelector(selector);
  (usable(target)?target:dismiss)?.focus({preventScroll:true});
 }
 dismiss?.addEventListener('click',()=>close());
 dialog?.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog?.addEventListener('close',()=>{if(session&&!dialog.open)close();});
 dialog?.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const box=dialog.getBoundingClientRect();
  if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();
 });
 dialog?.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!event.isComposing){event.preventDefault();close();return;}
  if(event.key!=='Tab'||event.ctrlKey||event.altKey||event.metaKey)return;
  const controls=[...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(usable);
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 });
 window.addEventListener('pagehide',()=>close({restoreFocus:false}));
 window.addEventListener('popstate',()=>close());
 return {open,close,captureFocus,restoreFocus};
}
