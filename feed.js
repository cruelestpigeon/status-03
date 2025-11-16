import { loadData, saveData } from './storage.js';
export function renderFeed(){
 const page=document.getElementById('page');
 let data=loadData();
 page.innerHTML=`<h2>Feed</h2>
 <textarea id='newPost' placeholder='Write a post...'></textarea>
 <button id='postBtn'>Post</button>
 <div id='posts'></div>`;
 document.getElementById('postBtn').onclick=()=>{
  let txt=document.getElementById('newPost').value.trim();
  if(!txt)return;
  data.posts.unshift({text:txt,comments:generateCharacterComments(txt,data)});
  saveData(data);
  renderFeed();
 };
 renderPosts(data);
}
function renderPosts(data){
 const div=document.getElementById('posts');
 div.innerHTML="";
 data.posts.forEach((p,i)=>{
  let c=p.comments.map(c=>`<div class='comment'><b>${c.name}:</b> ${c.text}</div>`).join('');
  div.innerHTML+=`<div class='post'><p>${p.text}</p>${c}</div>`;
 });
}
function generateCharacterComments(text,data){
 return data.characters.map(c=>({name:c.name,text:`${c.personality} reacts to: ${text}`}));}