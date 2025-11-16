import { loadData, saveData } from './storage.js';
export function renderLore(){
 const page=document.getElementById('page');
 let data=loadData();
 page.innerHTML=`<h2>Universe Lore</h2>
 <textarea id='loreText' style='width:100%;height:200px;'>${data.lore}</textarea>
 <button id='saveLore'>Save</button>`;
 document.getElementById('saveLore').onclick=()=>{
  data.lore=document.getElementById('loreText').value;
  saveData(data);
 };
}