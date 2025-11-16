export function loadData(){
 let d=localStorage.getItem('statusApp');
 if(d)return JSON.parse(d);
 return {posts:[],characters:[],lore:""};
}
export function saveData(d){localStorage.setItem('statusApp',JSON.stringify(d));}