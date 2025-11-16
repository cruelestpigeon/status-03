import { loadData, saveData } from './storage.js';
export function renderCharacters(){
 const page=document.getElementById('page');
 let data=loadData();
 page.innerHTML=`<h2>Characters</h2>
 <button id='addChar'>Add Character</button>
 <div id='charList'></div>`;
 document.getElementById('addChar').onclick=()=>{
  let name=prompt("Name");if(!name)return;
  data.characters.push({name,personality:"",messages:[]});saveData(data);renderCharacters();
 };
 let list=document.getElementById('charList');
 data.characters.forEach((c,i)=>{
  let d=document.createElement('div');
  d.innerHTML=`<b>${c.name}</b> <button data-i='${i}' class='edit'>Edit</button>`;
  list.appendChild(d);
 });
 list.onclick=e=>{
  if(e.target.classList.contains('edit')){
    let i=e.target.dataset.i;
    let p=prompt("Personality",data.characters[i].personality);
    if(p!==null){data.characters[i].personality=p;saveData(data);renderCharacters();}
  }
 };
}