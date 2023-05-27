class LocalSearch{constructor({path:e="",unescape:t=!1,top_n_per_article:n=1}){this.path=e,this.unescape=t,this.top_n_per_article=n,this.isfetched=!1,this.datas=null}getIndexByWord(e,t,n=!1){const s=[],o=new Set;return n||(t=t.toLowerCase()),e.forEach((e=>{if(this.unescape){const t=document.createElement("div");t.innerText=e,e=t.innerHTML}const i=e.length;if(0===i)return;let r=0,a=-1;for(n||(e=e.toLowerCase());(a=t.indexOf(e,r))>-1;)s.push({position:a,word:e}),o.add(e),r=a+i})),s.sort(((e,t)=>e.position!==t.position?e.position-t.position:t.word.length-e.word.length)),[s,o]}mergeIntoSlice(e,t,n){let s=n[0],{position:o,word:i}=s;const r=[],a=new Set;for(;o+i.length<=t&&0!==n.length;){a.add(i),r.push({position:o,length:i.length});const e=o+i.length;for(n.shift();0!==n.length&&(s=n[0],o=s.position,i=s.word,e>o);)n.shift()}return{hits:r,start:e,end:t,count:a.size}}highlightKeyword(e,t){let n="",s=t.start;for(const{position:o,length:i}of t.hits)n+=e.substring(s,o),s=o+i,n+=`<mark class="search-keyword">${e.substr(o,i)}</mark>`;return n+=e.substring(s,t.end),n}getResultItems(e){const t=[];return this.datas.forEach((({title:n,content:s,url:o})=>{const[i,r]=this.getIndexByWord(e,n),[a,c]=this.getIndexByWord(e,s),l=new Set([...r,...c]).size,h=i.length+a.length;if(0===h)return;const d=[];0!==i.length&&d.push(this.mergeIntoSlice(0,n.length,i));let u=[];for(;0!==a.length;){const e=a[0],{position:t}=e;u.push(this.mergeIntoSlice(Math.max(0,t-20),Math.min(s.length,t+100),a))}u.sort(((e,t)=>e.count!==t.count?t.count-e.count:e.hits.length!==t.hits.length?t.hits.length-e.hits.length:e.start-t.start));const g=parseInt(this.top_n_per_article,10);g>=0&&(u=u.slice(0,g));let p="";(o=new URL(o,location.origin)).searchParams.append("highlight",e.join(" ")),p+=0!==d.length?`<div class="local-search-hit-item"><a href="${o.href}"><span class="search-result-title">${this.highlightKeyword(n,d[0])}</span>`:`<div class="local-search-hit-item"><a href="${o.href}"><span class="search-result-title">${n}</span>`,u.forEach((e=>{p+=`<p class="search-result">${this.highlightKeyword(s,e)}...</p></a>`})),p+="</div>",t.push({item:p,id:t.length,hitCount:h,includedCount:l})})),t}fetchData(){const e=!this.path.endsWith("json");fetch(this.path).then((e=>e.text())).then((t=>{this.isfetched=!0,this.datas=e?[...(new DOMParser).parseFromString(t,"text/xml").querySelectorAll("entry")].map((e=>({title:e.querySelector("title").textContent,content:e.querySelector("content").textContent,url:e.querySelector("url").textContent}))):JSON.parse(t),this.datas=this.datas.filter((e=>e.title)).map((e=>(e.title=e.title.trim(),e.content=e.content?e.content.trim().replace(/<[^>]+>/g,""):"",e.url=decodeURIComponent(e.url).replace(/\/{2,}/g,"/"),e))),window.dispatchEvent(new Event("search:loaded"))}))}highlightText(e,t,n){const s=e.nodeValue;let o=t.start;const i=[];for(const{position:e,length:r}of t.hits){const t=document.createTextNode(s.substring(o,e));o=e+r;const a=document.createElement("mark");a.className=n,a.appendChild(document.createTextNode(s.substr(e,r))),i.push(t,a)}e.nodeValue=s.substring(o,t.end),i.forEach((t=>{e.parentNode.insertBefore(t,e)}))}highlightSearchWords(e){const t=new URL(location.href).searchParams.get("highlight"),n=t?t.split(" "):[];if(!n.length||!e)return;const s=document.createTreeWalker(e,NodeFilter.SHOW_TEXT,null),o=[];for(;s.nextNode();)s.currentNode.parentNode.matches("button, select, textarea, .mermaid")||o.push(s.currentNode);o.forEach((e=>{const[t]=this.getIndexByWord(n,e.nodeValue);if(!t.length)return;const s=this.mergeIntoSlice(0,e.nodeValue.length,t);this.highlightText(e,s,"search-keyword")}))}}window.addEventListener("load",(()=>{const{path:e,top_n_per_article:t,unescape:n,languages:s}=GLOBAL_CONFIG.localSearch,o=new LocalSearch({path:e,top_n_per_article:t,unescape:n}),i=document.querySelector("#local-search-input input"),r=document.getElementById("local-search-stats-wrap"),a=document.getElementById("loading-status"),c=()=>{if(!o.isfetched)return;const e=i.value.trim().toLowerCase();""!==e&&(a.innerHTML='<i class="fas fa-spinner fa-pulse"></i>');const t=e.split(/[-\s]+/),n=document.getElementById("local-search-results");let c=[];if(e.length>0&&(c=o.getResultItems(t)),1===t.length&&""===t[0])n.classList.add("no-result"),n.textContent="";else if(0===c.length)n.textContent="",r.innerHTML=`<div class="search-result-stats">${s.hits_empty.replace(/\$\{query}/,e)}</div>`;else{c.sort(((e,t)=>e.includedCount!==t.includedCount?t.includedCount-e.includedCount:e.hitCount!==t.hitCount?t.hitCount-e.hitCount:t.id-e.id));const e=s.hits_stats.replace(/\$\{hits}/,c.length);n.classList.remove("no-result"),n.innerHTML=`<div class="search-result-list">${c.map((e=>e.item)).join("")}</div>`,r.innerHTML=`<hr><div class="search-result-stats">${e}</div>`,window.pjax&&window.pjax.refresh(n)}a.innerHTML=""};let l=!1;const h=document.getElementById("search-mask"),d=document.querySelector("#local-search .search-dialog"),u=()=>{window.innerWidth<768&&d.style.setProperty("--search-height",window.innerHeight+"px")},g=()=>{const e=document.body.style;e.width="100%",e.overflow="hidden",btf.animateIn(h,"to_show 0.5s"),btf.animateIn(d,"titleScale 0.5s"),setTimeout((()=>{i.focus()}),300),l||(!o.isfetched&&o.fetchData(),i.addEventListener("input",c),l=!0),document.addEventListener("keydown",(function e(t){"Escape"===t.code&&(p(),document.removeEventListener("keydown",e))})),u(),window.addEventListener("resize",u)},p=()=>{const e=document.body.style;e.width="",e.overflow="",btf.animateOut(d,"search_close .5s"),btf.animateOut(h,"to_hide 0.5s"),window.removeEventListener("resize",u)},m=()=>{document.querySelector("#search-button > .search").addEventListener("click",g)};window.addEventListener("search:loaded",(()=>{const e=document.getElementById("loading-database");e.nextElementSibling.style.display="block",e.remove()})),m(),document.querySelector("#local-search .search-close-button").addEventListener("click",p),h.addEventListener("click",p),GLOBAL_CONFIG.localSearch.preload&&o.fetchData(),o.highlightSearchWords(document.getElementById("article-container")),window.addEventListener("pjax:complete",(()=>{!btf.isHidden(h)&&p(),o.highlightSearchWords(document.getElementById("article-container")),m()}))}));