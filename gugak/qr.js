'use strict';
(() => {
  const button=document.querySelector('#homeQrButton');
  const dialog=document.querySelector('#joinQrDialog');
  const syncHomeQr=()=>{
    const isHome=!location.hash||location.hash==='#home';
    button.hidden=!isHome;
    document.querySelector('.topbar').classList.toggle('home-header',isHome);
  };
  button.addEventListener('click',()=>dialog.showModal());
  document.querySelector('#closeJoinQr').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const bounds=dialog.getBoundingClientRect();
    if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();
  });
  dialog.addEventListener('close',()=>{if(!button.hidden)button.focus({preventScroll:true});});
  window.addEventListener('hashchange',syncHomeQr);
  syncHomeQr();
})();
