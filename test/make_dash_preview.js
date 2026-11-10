// 현황판 화면을 가짜 데이터로 미리 보는 파일(test/dash_preview.html)을 만들어요. 실행: node test/make_dash_preview.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ctx = {console};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'hub', 'Code.gs'), 'utf8'), ctx);
let html = vm.runInContext('dashboardHtml_', ctx)('K');
const shim = `<script>
var FAKE={today:'2026-11-10',now:'10:45:00',rows:[
 {ws:'gugak-instruments',title:'국악기 학습지',num:'00000',name:'연결시험',state:'자리 비움',away:'2',last:'2026-11-09 20:37:53',score:'1'},
 {ws:'gugak-instruments',title:'국악기 학습지',num:'10701',name:'김하늘',state:'제출함',away:'0',last:'2026-11-10 10:42:00',score:'11'},
 {ws:'gugak-instruments',title:'국악기 학습지',num:'10702',name:'이바다',state:'풀이 중',away:'1',last:'2026-11-10 10:44:00',score:''},
 {ws:'gugak-instruments',title:'국악기 학습지',num:'10703',name:'<b>박구름</b>',state:'자리 비움',away:'3',last:'2026-11-10 10:45:00',score:''},
 {ws:'dance-1',title:'춤 학습지',num:'10704',name:'최별',state:'제출함',away:'0',last:'2026-11-10 09:41:00',score:'13'}]};
window.CALLS=[];
function runner(){var ok=function(){},fail=function(){};var r={withSuccessHandler:function(f){ok=f;return r},withFailureHandler:function(f){fail=f;return r},
 dashboardData:function(){var d=JSON.parse(JSON.stringify(FAKE));setTimeout(function(){ok(d)},10)},
 dashboardDelete:function(k,ws,people,hard){CALLS.push(['delete',ws,people.length,hard]);var gone={};people.forEach(function(p){gone[p.num+'|'+p.name]=1});var removed=[];
  FAKE.rows=FAKE.rows.filter(function(x){if(x.ws===ws&&gone[x.num+'|'+x.name]){removed.push([x.ws,x.title,x.num,x.name,x.state,x.away,x.last,x.score]);return false}return true});
  setTimeout(function(){ok({removed:removed,removedLog:hard?removed.length*3:0,removedSubmit:hard?1:0})},10)},
 dashboardRestore:function(k,rows){CALLS.push(['restore',rows.length]);rows.forEach(function(v){FAKE.rows.push({ws:v[0],title:v[1],num:v[2],name:v[3],state:v[4],away:v[5],last:v[6],score:v[7]})});setTimeout(function(){ok({restored:rows.length})},10)}};return r}
window.google={script:{get run(){return runner()}}};
</script>`;
html = html.replace('<script>', shim + '<script>');
fs.writeFileSync(path.join(__dirname, 'dash_preview.html'), html);
console.log('wrote test/dash_preview.html');
