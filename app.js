export function initApp() {
  document.getElementById('app').innerHTML = `
    <div class="nav">
      <button data-panel="feed">Feed</button>
      <button data-panel="characters">Characters</button>
      <button data-panel="settings">Settings</button>
    </div>
    <div id="panel"></div>
  `;
  document.querySelectorAll(".nav button").forEach(btn=>{
    btn.onclick=()=> {
      const p=document.getElementById('panel');
      if(btn.dataset.panel==='feed') p.textContent="Feed panel placeholder";
      if(btn.dataset.panel==='characters') p.textContent="Characters panel placeholder";
      if(btn.dataset.panel==='settings') p.textContent="Settings panel placeholder";
    };
  });
}