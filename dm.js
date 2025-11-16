import { loadData, saveData } from './storage.js';
export function renderDM(){
 const page=document.getElementById('page');
 let data=loadData();
 page.innerHTML=`<h2>DMs</h2>
 <div id='charList'></div>
 <div id='chatBox'></div>`;
 const list=document.getElementById('charList');
 data.characters.forEach((c,i)=>{
  let b=document.createElement('button');
  b.textContent=c.name;
  b.onclick=()=>openChat(i);
  list.appendChild(b);
 });
 function openChat(i){
  let chat=document.getElementById('chatBox');
  chat.innerHTML=`<h3>${data.characters[i].name}</h3>
   <div id='msgs'></div>
   <input id='msgInput'><button id='sendMsg'>Send</button>`;
  let msgsDiv=document.getElementById('msgs');
  data.characters[i].messages=data.characters[i].messages||[];
  msgsDiv.innerHTML=data.characters[i].messages.map(m=>`<div>${m}</div>`).join('');
  document.getElementById('sendMsg').onclick=()=>{
    let t=document.getElementById('msgInput').value.trim();if(!t)return;
    data.characters[i].messages.push("You: "+t);
    data.characters[i].messages.push(c.name+": "+c.personality+" replies to "+t);
    saveData(data); openChat(i);
  };
 }
}