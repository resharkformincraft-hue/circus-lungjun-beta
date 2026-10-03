import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDeck,initialState,validateAction,applyAction,canPlayCard,scoreGame,TYPES,COLORS} from '../server/game.js';

test('deck has exactly 112 cards',()=>{const d=makeDeck();assert.equal(d.length,112);assert.equal(d.filter(c=>c.type===TYPES.LETTER).length,72);assert.equal(d.filter(c=>c.type===TYPES.DOUBLE).length,8);assert.equal(d.filter(c=>c.type===TYPES.TRIPLE).length,8);assert.equal(d.filter(c=>c.type===TYPES.DRAW_FOUR).length,4);assert.equal(d.filter(c=>c.type===TYPES.BACKWORD).length,8);assert.equal(d.filter(c=>c.type===TYPES.SKIP).length,8);});

test('initial state deals five and opens a letter',()=>{const s=initialState([{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}]);assert.equal(s.players.every(p=>p.hand.length===5),true);assert.equal(s.discardPile.at(-1).type,TYPES.LETTER);assert.equal(s.phase,'FIRST_TURN');});

test('first turn cannot INSERT',()=>{const s=initialState([{id:'a',name:'A'},{id:'b',name:'B'}]);const p=s.players[1];p.hand=[{id:'x',type:TYPES.LETTER,color:s.currentColor,letter:s.discardPile.at(-1).letter}];s.insertWindow={active:true,sourcePlayerId:'a',eligiblePlayers:['b']};s.phase='INSERT_WINDOW';assert.equal(validateAction(s,'b',{type:'INSERT_CARD',cardId:'x'}).ok,false);});

test('double stacks only double',()=>{const s=initialState([{id:'a',name:'A'},{id:'b',name:'B'}]);s.phase='PLAYING';s.currentPlayerId='a';s.currentColor='RED';s.discardPile=[{id:'top',type:TYPES.LETTER,color:'RED',letter:'A'}];s.players[0].hand=[{id:'d',type:TYPES.DOUBLE,color:'RED'}];const n=applyAction(s,'a',{type:'PLAY_CARD',cardId:'d'});assert.equal(n.pendingEffect.amount,2);assert.equal(n.pendingEffect.stackType,TYPES.DOUBLE);});

test('reset draws two for everyone except actor',()=>{const s=initialState([{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}]);s.phase='PLAYING';s.currentPlayerId='a';s.players[0].hand=[{id:'r',type:TYPES.RESET_PLUS2_ALL}];const before=s.players.slice(1).map(p=>p.hand.length);const n=applyAction(s,'a',{type:'PLAY_CARD',cardId:'r'});assert.equal(n.players[1].hand.length,before[0]+2);assert.equal(n.players[2].hand.length,before[1]+2);assert.equal(n.resetInProgress,false);assert.ok(['PLAYING','LAST_DANCE'].includes(n.phase));});

test('circus caller can punish one-card target',()=>{const s=initialState([{id:'a',name:'A'},{id:'b',name:'B'}]);s.phase='PLAYING';s.players[1].hand=[{id:'x',type:TYPES.LETTER,color:'RED',letter:'A'}];const n=applyAction(s,'a',{type:'CALL_CIRCUS',targetPlayerId:'b'});assert.equal(n.players[1].hand.length,6);});

test('score winner gets three points and a second-place card-count tie gets one',()=>{const s=initialState([{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}]);s.winnerId='a';s.players[0].hand=[];s.players[1].hand=[{},{}];s.players[2].hand=[{},{}];const r=scoreGame(s);assert.equal(r.find(x=>x.userId==='a').points,3);assert.equal(r.find(x=>x.userId==='b').points,1);assert.equal(r.find(x=>x.userId==='c').points,1);});

test('last dance ends after everyone passes once',()=>{const s=initialState([{id:'a',name:'A'},{id:'b',name:'B'}]);s.phase='LAST_DANCE';s.lastDance=true;s.currentPlayerId='a';s.players.forEach(p=>p.hand=[]);let n=applyAction(s,'a',{type:'PASS'});assert.equal(n.phase,'LAST_DANCE');n=applyAction(n,'b',{type:'PASS'});assert.equal(n.phase,'GAME_FINISHED');assert.equal(n.winnerId,null);});


test('special cards can be played across colors',()=>{
 const s=initialState([{id:'a',name:'A'},{id:'b',name:'B'}]);
 s.phase='PLAYING';s.currentPlayerId='a';s.currentColor='RED';s.discardPile=[{id:'top',type:TYPES.LETTER,color:'RED',letter:'A',value:-1}];
 s.players[0].hand=[{id:'x',type:TYPES.SKIP,color:'BLUE',letter:null,value:-20},{id:'y',type:TYPES.BACKWORD,color:'GREEN',letter:null,value:-20}];
 assert.equal(canPlayCard(s,'a','x').ok,true);assert.equal(canPlayCard(s,'a','y').ok,true);
});

test('difference uses the printed card values',()=>{
 const s=initialState([{id:'a',name:'A'},{id:'b',name:'B'}]);
 s.winnerId='a';s.players[0].hand=[];s.players[1].hand=[{id:'1',type:TYPES.DOUBLE,value:-20},{id:'2',type:TYPES.DRAW_FOUR,value:-40},{id:'3',type:TYPES.JOKER,value:-70}];
 const r=scoreGame(s).find(x=>x.userId==='b');assert.equal(r.difference,-130);
});
