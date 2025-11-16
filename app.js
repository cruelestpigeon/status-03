
/* src/app.js - upgraded single-file app behavior (keeps modular file layout) */

const STORAGE_KEY = 'status_ai_app_v3_updated';

function defaultState(){
  return {
    me:{id:'me',displayName:'You',username:'you',bio:''},
    characters: [],
    posts: [],
    dms: {},
    lore: '',
    settings: {}
  };
}

function loadState(){ try{ const raw = localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw): defaultState(); }catch(e){ return defaultState(); } }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); }

let STATE = loadState();

function uid(prefix='id'){ return prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,6); }
function esc(s){ return String(s||''); }
function toK(n){ if(n>=1000) return (Math.round(n/100)/10)+'k'; return String(n||0); }

/* Render app shell */
function renderApp(){
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="nav card">
      <button id="btnFeed">Feed</button>
      <button id="btnChars">Characters</button>
      <button id="btnDMs">DMs</button>
      <button id="btnLore">Universe</button>
      <button id="btnSettings">Settings</button>
    </div>
    <div class="container"><div class="left" id="leftCol"></div><div class="right" id="rightCol"></div></div>
    <div class="footer">Status AI — upgraded v3</div>
  `;
  document.getElementById('btnFeed').onclick = ()=> showFeed();
  document.getElementById('btnChars').onclick = ()=> showCharacters();
  document.getElementById('btnDMs').onclick = ()=> showDMs();
  document.getElementById('btnLore').onclick = ()=> showLore();
  document.getElementById('btnSettings').onclick = ()=> showSettings();
  showCharacters();
}

/* Feed */
function showFeed(filterAuthorId){
  const left = document.getElementById('leftCol'); const right = document.getElementById('rightCol');
  left.innerHTML=''; right.innerHTML='';
  const compose = document.createElement('div'); compose.className='card';
  compose.innerHTML = `
    <textarea id="postText" placeholder="Write a post..." class="input"></textarea>
    <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
      <select id="postAuthor" class="input"></select>
      <button id="postBtn" class="btn">Post</button>
      <button id="clearBtn" class="smalllink">Clear</button>
    </div>
  `;
  left.appendChild(compose);
  const sel = compose.querySelector('#postAuthor');
  sel.innerHTML = `<option value="me">${esc(STATE.me.displayName)} (you)</option>`;
  STATE.characters.forEach(c => sel.innerHTML += `<option value="${c.id}">${esc(c.displayName||c.username)}</option>`);
  compose.querySelector('#postBtn').onclick = ()=> {
    const text = document.getElementById('postText').value.trim();
    if(!text) return alert('Write something');
    const authorId = document.getElementById('postAuthor').value;
    createPost(authorId, text);
    document.getElementById('postText').value='';
    renderFeedPosts(filterAuthorId);
  };
  compose.querySelector('#clearBtn').onclick = ()=> document.getElementById('postText').value='';
  const postsDiv = document.createElement('div'); postsDiv.id='postsDiv'; left.appendChild(postsDiv);
  renderFeedPosts(filterAuthorId);

  const rightCard = document.createElement('div'); rightCard.className='card';
  rightCard.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><strong>Characters</strong><button id="newChar" class="smalllink">+ New</button></div><div id="charListSmall" style="margin-top:8px"></div>`;
  right.appendChild(rightCard);
  rightCard.querySelector('#newChar').onclick = ()=> openCharacterEditor();
  renderCharacterListSmall();
}

function renderFeedPosts(filterAuthorId){
  const container = document.getElementById('postsDiv'); container.innerHTML='';
  const posts = STATE.posts.slice();
  for(const p of posts){
    if(filterAuthorId && p.authorId !== filterAuthorId) continue;
    container.appendChild(renderPostElement(p));
  }
}

function renderPostElement(p){
  const wrapper = document.createElement('div'); wrapper.className='post';
  const author = (p.authorId==='me')? STATE.me : (STATE.characters.find(x=>x.id===p.authorId) || {displayName:p.authorId,username:p.authorId,img:''});
  wrapper.innerHTML = `
    <div class="post-header">
      <img class="post-avatar" src="${esc(author.img||'')}" onerror="this.style.display='none'">
      <div class="post-user">
        <div class="post-display">${esc(author.displayName)}</div>
        <div class="post-username">@${esc(author.username||author.displayName||author.id)}</div>
      </div>
    </div>
    <div class="post-divider"></div>
    <div class="post-content">${esc(p.text)}</div>
    <div class="post-divider"></div>
    <div class="post-stats">
      <div class="controls like-btn" title="Likes"><span class="icon">♡</span> <span>${toK(Number(p.likes||0))}</span></div>
      <div class="controls" title="Repost"><span class="icon">⇄</span></div>
      <div class="controls replies-btn" title="Replies"><span class="icon">⌯⌲</span> <span>${toK(Number(p.replies||0))}</span></div>
    </div>
  `;
  wrapper.querySelector('.like-btn').onclick = ()=> { p.likes = (p.likes||0) + 1; saveState(); renderFeedPosts(); };
  wrapper.querySelector('.replies-btn').onclick = ()=> openThread(p.id);
  return wrapper;
}

/* Posts creation + characters reply once each time a post created*/
function createPost(authorId, text){
  const post = { id: uid('post'), authorId, text, createdAt: Date.now(), likes:0, replies:0 };
  if(authorId !== 'me'){
    const author = STATE.characters.find(x=>x.id===authorId);
    const followers = Number(author.followers||0);
    post.likes = Math.floor(followers*0.03 + Math.random()*followers*0.02);
  }
  STATE.posts.unshift(post);
  // one reply per character (except author)
  for(const c of STATE.characters){
    if(c.id === authorId) continue;
    const replyText = generateCharacterPost(c, authorId, text, STATE.lore||'');
    const cp = { id: uid('post'), authorId: c.id, text: replyText, createdAt: Date.now(), likes: Math.floor(Number(c.followers||0)*0.02), replies:0 };
    STATE.posts.unshift(cp);
  }
  saveState();
}

/* simple in-character generator based on description/relationships/lore */
function generateCharacterPost(character, originalAuthorId, originalText, lore){
  const name = character.displayName || character.username || 'Someone';
  const desc = (character.description || '').replace(/<[^>]+>/g,'').trim();
  const rel = (character.relationships || '').replace(/<[^>]+>/g,'').trim();
  const keywords = (desc + ' ' + rel).toLowerCase();
  let tone = 'neutral';
  if(keywords.match(/love|friend|ally/)) tone = 'friendly';
  if(keywords.match(/hate|enemy|rival|hostile/)) tone = 'hostile';
  if(keywords.match(/mischief|trick|prank/)) tone = 'playful';
  const templates = {
    neutral: [`${name} thinks about "${truncate(originalText,80)}".`,`${name} replies: "Interesting."`,`${name} comments briefly.`],
    friendly: [`${name} smiles and offers help regarding "${truncate(originalText,60)}".`,`${name} cheers: "I support this!"`],
    hostile: [`${name} retorts sharply.`,`${name} scoffs at the idea.`],
    playful: [`${name} jokes about it.`,`${name} teases playfully.`]
  };
  const arr = templates[tone] || templates.neutral;
  const t = arr[Math.floor(Math.random()*arr.length)];
  const extra = desc ? ` (${shorten(desc,60)})` : '';
  return t + extra;
}
function truncate(s,n){ if(!s) return ''; return s.length>n? s.slice(0,n-1)+'…': s; }
function shorten(s,n){ if(!s) return ''; return s.length>n? s.slice(0,n-1)+'…': s; }

/* Thread view */
function openThread(postId){
  const post = STATE.posts.find(x=>x.id===postId); if(!post) return alert('Post not found');
  const left = document.getElementById('leftCol');
  const modal = document.createElement('div'); modal.className='card';
  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center"><strong>Thread</strong><button id="closeThread" class="smalllink">Close</button></div>
    <div style="margin-top:8px"><strong>${esc((post.authorId==='me')?STATE.me.displayName:(STATE.characters.find(c=>c.id===post.authorId)||{displayName:post.authorId}).displayName)}</strong>
    <div class="meta">${new Date(post.createdAt).toLocaleString()}</div>
    <div style="margin-top:8px">${esc(post.text)}</div></div>
    <div id="threadReplies" style="margin-top:12px"></div>
  `;
  left.insertBefore(modal, left.firstChild);
  document.getElementById('closeThread').onclick = ()=> left.removeChild(modal);
  const repliesDiv = modal.querySelector('#threadReplies');
  const replies = STATE.posts.filter(pp=>pp.id!==post.id && pp.text && pp.text.includes(post.text.slice(0,30)));
  repliesDiv.innerHTML = replies.map(r=>`<div style="padding:8px;border-radius:8px;background:#fff;margin-bottom:6px"><strong>${esc((r.authorId==='me')?STATE.me.displayName:(STATE.characters.find(c=>c.id===r.authorId)||{displayName:r.authorId}).displayName)}</strong><div class="meta">${new Date(r.createdAt).toLocaleString()}</div><div style="margin-top:6px">${esc(r.text)}</div></div>`).join('');
}

/* Characters & Profile UI */
function showCharacters(){
  const left = document.getElementById('leftCol'); const right = document.getElementById('rightCol');
  left.innerHTML=''; right.innerHTML='';
  const card = document.createElement('div'); card.className='card';
  card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><strong>𖣠 | NEW CHARACTER</strong><button id="newCharBtn" class="smalllink">+ New Character</button></div><div id="charsCompact" style="margin-top:8px"></div>`;
  left.appendChild(card);
  card.querySelector('#newCharBtn').onclick = ()=> openCharacterEditor();
  const compact = card.querySelector('#charsCompact'); compact.innerHTML='';
  for(const c of STATE.characters){
    const row = document.createElement('div'); row.className='charRow' ;
    row.innerHTML = `<img class="charAvatar" src="${esc(c.img||'')}" onerror="this.style.display='none'"><div style="flex:1"><div class="char-name" data-id="${esc(c.id)}" style="font-weight:700">${esc(c.displayName)}</div><div class="meta">@${esc(c.username)}</div></div><div><button class="smalllink" onclick="viewProfile('${c.id}')">View</button></div>`;
    compact.appendChild(row);
  }
  compact.querySelectorAll('.char-name').forEach(el=> el.onclick = ()=> viewProfile(el.getAttribute('data-id')) );
  renderCharacterListSmall();
}

window.viewProfile = function(charId){
  const left = document.getElementById('leftCol'); const right = document.getElementById('rightCol');
  const c = STATE.characters.find(x=>x.id===charId); if(!c) return alert('Character not found');
  left.innerHTML=''; right.innerHTML='';
  const wrapper = document.createElement('div'); wrapper.className='profile-card';
  wrapper.innerHTML = `
    <button class="back-btn" id="backFromProfile">← Back</button>
    <div class="profileHeader" id="profileHeader" style="background-image:url('${esc(c.header||'')}')"></div>
    <img class="profileAvatar" id="profileAvatar" src="${esc(c.img||'')}" onerror="this.style.display='none'">
    <div class="card profile-card">
      <div class="profile-name" style="text-align:center">
        <div class="profile-display" id="profileDisplay" contenteditable="true">${esc(c.displayName)}</div>
        <div class="profile-username" id="profileUsername" contenteditable="true">@${esc(c.username)}</div>
      </div>
      <div class="profile-divider"></div>
      <div style="display:flex;justify-content:center;gap:12px"><button class="smalllink" id="openDMBtn">˗ˏˋ ꒰ ✉︎ ꒱ ˎˊ˗</button><button class="smalllink" id="saveProfileBtn">♡</button></div>
      <div class="profile-divider"></div>
      <div id="bioBox" class="section-box contenteditable" contenteditable="true">${c.bio? c.bio : ''}</div>
      <div class="follow-counts"><div>Following: <strong id="followingCount">${esc(c.following||0)}</strong></div><div>Followers: <strong id="followersCount">${esc(c.followers||0)}</strong></div></div>
      <div class="profile-divider"></div>
      <div class="section-title">𖣠 | DESCRIPTIONS</div>
      <div class="section-box contenteditable" id="descBox" contenteditable="true">${c.description? c.description : ''}</div>
      <div class="profile-divider"></div>
      <div class="section-title">𖣠 | RELATIONSHIPS</div>
      <div class="section-box contenteditable" id="relBox" contenteditable="true">${c.relationships? c.relationships : ''}</div>
      <div style="margin-top:12px"><button class="btn smalllink" id="editProfileBtn">Edit profile</button></div>
    </div>
  `;
  left.appendChild(wrapper);

  document.getElementById('backFromProfile').onclick = ()=> showCharacters();
  document.getElementById('openDMBtn').onclick = ()=> openChatById(c.id);
  document.getElementById('saveProfileBtn').onclick = ()=> saveProfileEdits(c.id);
  document.getElementById('editProfileBtn').onclick = ()=> openCharacterEditor(c.id);

  // clicking header or avatar lets you upload image (after save or immediately)
  const headerEl = document.getElementById('profileHeader');
  const avatarEl = document.getElementById('profileAvatar');
  headerEl.onclick = ()=> promptAndSetImageForCharacter(c.id, 'header', headerEl);
  avatarEl.onclick = ()=> promptAndSetImageForCharacter(c.id, 'img', avatarEl);
  renderCharacterListSmall();
}

/* small list right column */
function renderCharacterListSmall(){
  const right = document.getElementById('rightCol'); if(!right) return;
  right.innerHTML='';
  const card = document.createElement('div'); card.className='card';
  card.innerHTML = `<strong>Characters</strong><div style="margin-top:8px" id="smallList"></div>`;
  right.appendChild(card);
  const smallList = card.querySelector('#smallList');
  for(const c of STATE.characters){
    const row = document.createElement('div'); row.className='charRow';
    row.innerHTML = `<img class="charAvatar" src="${esc(c.img||'')}" onerror="this.style.display='none'"><div style="flex:1"><div style="font-weight:700">${esc(c.displayName)}</div><div class="meta">@${esc(c.username)}</div></div><div><button class="smalllink" onclick="viewProfile('${c.id}')">View</button></div>`;
    smallList.appendChild(row);
  }
}

/* Character editor */
window.openCharacterEditor = function(charId){
  const left = document.getElementById('leftCol'); left.innerHTML='';
  let obj = { id: uid('char'), displayName:'', username:'', bio:'', description:'', relationships:'', img:'', header:'', followers:0, following:0 };
  if(charId){ const found = STATE.characters.find(x=>x.id===charId); if(found) obj = found; }
  const form = document.createElement('div'); form.className='card';
  form.innerHTML = `
    <h3>${charId? 'Edit Character':'New Character'}</h3>
    <label>Header image — click the header on profile to set after saving</label>
    <label>Profile image — click the avatar on profile to set after saving</label>
    <label>Display name</label><input id="displayName" class="input" value="${esc(obj.displayName)}">
    <label>Username</label><input id="username" class="input" value="${esc(obj.username)}">
    <label>Bio</label><div id="bioEdit" class="contenteditable" contenteditable="true">${obj.bio||''}</div>
    <label>Followers</label><input id="followers" class="input" type="number" value="${esc(obj.followers||0)}">
    <label>Following</label><input id="following" class="input" type="number" value="${esc(obj.following||0)}">
    <label>Character description (rich text)</label><div id="descEdit" class="section-box contenteditable" contenteditable="true">${obj.description||''}</div>
    <label>Relationship notes (rich text)</label><div id="relEdit" class="section-box contenteditable" contenteditable="true">${obj.relationships||''}</div>
    <div style="margin-top:12px"><button id="saveChar" class="btn">Save</button> <button id="cancelChar" class="smalllink">Cancel</button></div>
  `;
  left.appendChild(form);

  document.getElementById('cancelChar').onclick = ()=> showCharacters();
  document.getElementById('saveChar').onclick = ()=> {
    const data = loadState();
    const c = {
      id: obj.id,
      displayName: document.getElementById('displayName').value || 'Unnamed',
      username: document.getElementById('username').value || ('user'+Math.floor(Math.random()*9999)),
      bio: document.getElementById('bioEdit').innerHTML || '',
      followers: Number(document.getElementById('followers').value || 0),
      following: Number(document.getElementById('following').value || 0),
      description: sanitize(document.getElementById('descEdit').innerHTML||''),
      relationships: sanitize(document.getElementById('relEdit').innerHTML||''),
      img: obj.img||'',
      header: obj.header||''
    };
    const idx = data.characters.findIndex(x=>x.id===c.id);
    if(idx>=0) data.characters[idx]=c; else data.characters.push(c);
    STATE = data; saveState(); showCharacters();
  };
}

/* DMs */
function showDMs(){ const left = document.getElementById('leftCol'); left.innerHTML=''; const card = document.createElement('div'); card.className='card'; card.innerHTML = `<h3>DMs</h3><div id="dmList"></div>`; left.appendChild(card); const list = document.getElementById('dmList'); list.innerHTML=''; for(const c of STATE.characters){ const b = document.createElement('button'); b.textContent = c.displayName||c.username; b.onclick = ()=> openChatById(c.id); list.appendChild(b); } }
function openChatById(charId){ const left = document.getElementById('leftCol'); left.innerHTML=''; const c = STATE.characters.find(x=>x.id===charId); if(!c) return alert('Not found'); const card = document.createElement('div'); card.className='card'; const convId = 'dm-'+charId; STATE.dms[convId] = STATE.dms[convId]||[]; card.innerHTML = `<h3>DM — ${esc(c.displayName)}</h3><div id="msgs" style="max-height:300px;overflow:auto;margin-bottom:8px"></div><input id="msgIn" class="input" placeholder="Type a message..."> <button id="sendMsg" class="btn">Send</button>`; left.appendChild(card); const msgs = document.getElementById('msgs'); function refresh(){ msgs.innerHTML = STATE.dms[convId].map(m=>`<div style="padding:8px;border-radius:8px;background:#fff;margin-bottom:6px"><strong>${esc(m.from==='me'?'You':c.displayName)}</strong><div class="meta">${new Date(m.ts).toLocaleString()}</div><div style="margin-top:6px">${esc(m.text)}</div></div>`).join(''); msgs.scrollTop = msgs.scrollHeight; } refresh(); document.getElementById('sendMsg').onclick = ()=>{ const t = document.getElementById('msgIn').value.trim(); if(!t) return; STATE.dms[convId].push({from:'me',text:t,ts:Date.now()}); const reply = c.displayName + ': ' + (c.description? (c.description.replace(/<[^>]+>/g,'').split('.')[0]) : '...') + ' replies to \"' + t + '\"'; STATE.dms[convId].push({from:'them',text:reply,ts:Date.now()}); saveState(); refresh(); document.getElementById('msgIn').value=''; }; }

/* Lore & Settings */
function showLore(){ const left = document.getElementById('leftCol'); left.innerHTML=''; const card = document.createElement('div'); card.className='card'; card.innerHTML = `<h3>Universe Lore</h3><textarea id="loreText" class="input" style="height:240px">${esc(STATE.lore||'')}</textarea><div style="margin-top:8px"><button id="saveLore" class="btn">Save</button></div>`; left.appendChild(card); document.getElementById('saveLore').onclick = ()=>{ STATE.lore = document.getElementById('loreText').value; saveState(); alert('Saved'); }; }
function showSettings(){ const left = document.getElementById('leftCol'); left.innerHTML=''; const s = STATE.settings||{}; const card = document.createElement('div'); card.className='card'; card.innerHTML = `<h3>Settings</h3><div class="card"><label>Background <input type="color" id="bgc" value="${esc(s.bg||'#f6f7fb')}"></label><label>Text <input type="color" id="tc" value="${esc(s.text||'#0f172a')}"></label><label>Accent <input type="color" id="ac" value="${esc(s.ac||'#0ea5a4')}"></label><label>Font <select id="fontSel"><option ${s.font==='Inter'?'selected':''}>Inter</option><option ${s.font==='Georgia'?'selected':''}>Georgia</option><option ${s.font==='Courier New'?'selected':''}>Courier New</option></select></label><div style="margin-top:8px"><button id="saveTheme" class="btn">Save Theme</button></div></div>`; left.appendChild(card); document.getElementById('saveTheme').onclick = ()=>{ STATE.settings.bg=document.getElementById('bgc').value; STATE.settings.text=document.getElementById('tc').value; STATE.settings.ac=document.getElementById('ac').value; STATE.settings.font=document.getElementById('fontSel').value; saveState(); applyTheme(); alert('Saved'); }; }

/* Image insertion helper */
function promptAndSetImageForCharacter(charId, field, elementToUpdate){
  const input = document.createElement('input'); input.type='file'; input.accept='image/*';
  input.onchange = ()=>{
    const f = input.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{
      const data = r.result;
      const idx = STATE.characters.findIndex(x=>x.id===charId);
      if(idx>=0){
        STATE.characters[idx][field] = data;
        saveState();
        if(field==='header') elementToUpdate.style.backgroundImage = `url('${data}')`;
        else elementToUpdate.src = data;
      }
    };
    r.readAsDataURL(f);
  };
  input.click();
}

/* Save edits from profile page */
function saveProfileEdits(charId){
  const idx = STATE.characters.findIndex(x=>x.id===charId); if(idx<0) return;
  const name = document.getElementById('profileDisplay').innerText.trim();
  const username = document.getElementById('profileUsername').innerText.replace(/^@/,'').trim();
  const bio = document.getElementById('bioBox').innerHTML;
  const desc = document.getElementById('descBox').innerHTML;
  const rel = document.getElementById('relBox').innerHTML;
  STATE.characters[idx].displayName = name || STATE.characters[idx].displayName;
  STATE.characters[idx].username = username || STATE.characters[idx].username;
  STATE.characters[idx].bio = sanitize(bio);
  STATE.characters[idx].description = sanitize(desc);
  STATE.characters[idx].relationships = sanitize(rel);
  saveState();
  alert('Profile saved');
  viewProfile(charId);
}

/* Utilities */
function sanitize(s){ return String(s||''); }
function applyTheme(){ const s = STATE.settings||{}; if(s.bg) document.documentElement.style.setProperty('--bg', s.bg); if(s.text) document.documentElement.style.setProperty('--text', s.text); if(s.ac) document.documentElement.style.setProperty('--accent', s.ac); if(s.font) document.body.style.fontFamily = s.font; }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); }

/* Start */
renderApp();
