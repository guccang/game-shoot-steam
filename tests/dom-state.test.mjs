// 验证持续刷新不重复变更DOM，并保留外部状态变化和赋值返回值。
import test from 'node:test';
import assert from 'node:assert/strict';
import {setHidden,setText} from '../src/ui/shared/dom-state.js';

test('重复显隐不写属性，外部改动后仍立即同步',()=>{
 let hidden=true,writes=0;
 const node={get hidden(){return hidden;},set hidden(value){writes++;hidden=value;}};
 for(let i=0;i<100;i++)setHidden(node,true);
 assert.equal(writes,0);
 assert.equal(setHidden(node,0),0);assert.equal(hidden,false);assert.equal(writes,1);
 hidden=true;setHidden(node,false);assert.equal(writes,2);
 setHidden(node,'until-found');setHidden(node,'until-found');assert.equal(writes,3);
});

test('数字和文字变化复用原文字节点，相同文字零写入',()=>{
 let writes=0,value='剩余10米';
 const child={nodeType:3,get data(){return value;},set data(text){writes++;value=text;}};
 const node={firstChild:child,childNodes:[child],get textContent(){return value;},set textContent(_){assert.fail('不应拆建已有文字节点');}};
 for(let i=0;i<100;i++)setText(node,'剩余10米');assert.equal(writes,0);
 setText(node,'剩余9米');assert.equal(node.firstChild,child);assert.equal(value,'剩余9米');
 assert.equal(setText(node,0),0);assert.equal(value,'0');
 setText(node,null);assert.equal(value,'');assert.equal(writes,3);
});

test('首次填充仍采用纯文字，站名不会作为HTML插入',()=>{
 const node={childNodes:[],textContent:''};
 setText(node,'<img src=x>');assert.equal(node.textContent,'<img src=x>');
});
