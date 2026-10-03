import crypto from 'node:crypto';

export const COLORS=['RED','YELLOW','GREEN','BLUE'];
export const LETTERS=['A','B','C','D','E','F','G','H','I'];
export const TYPES={LETTER:'LETTER',DOUBLE:'DOUBLE',TRIPLE:'TRIPLE',DRAW_FOUR:'DRAW_FOUR',BACKWORD:'BACKWORD',SKIP:'SKIP',JOKER:'JOKER',JOKER_BACKWORD:'JOKER_BACKWORD',JOKER_X2:'JOKER_X2',RESET_PLUS2_ALL:'RESET_PLUS2_ALL'};
const id=()=>crypto.randomUUID();
const card=(type,color=null,letter=null)=>({id:id(),type,color,letter});
export const isPlusType=t=>[TYPES.DOUBLE,TYPES.TRIPLE,TYPES.DRAW_FOUR].includes(t);
export const plusAmount=t=>t===TYPES.DOUBLE?2:t===TYPES.TRIPLE?3:t===TYPES.DRAW_FOUR?4:0;
const clone=o=>JSON.parse(JSON.stringify(o));
export function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

export function makeDeck(){
 const d=[];
 for(const l of LETTERS)for(const c of COLORS)for(let i=0;i<2;i++)d.push(card(TYPES.LETTER,c,l));
 for(const t of [TYPES.DOUBLE,TYPES.TRIPLE,TYPES.BACKWORD,TYPES.SKIP])for(const c of COLORS)for(let i=0;i<2;i++)d.push(card(t,c));
 for(let i=0;i<4;i++)d.push(card(TYPES.DRAW_FOUR));
 d.push(card(TYPES.JOKER),card(TYPES.JOKER_BACKWORD),card(TYPES.JOKER_X2),card(TYPES.RESET_PLUS2_ALL));
 if(d.length!==112)throw new Error('DECK_COUNT_MISMATCH');
 return d;
}
function player(s,pid){return s.players.find(p=>p.id===pid);}
function indexOf(s,pid){return s.players.findIndex(p=>p.id===pid);}
function stepIndex(s,from,steps=1){let i=indexOf(s,from);const dir=s.direction==='CW'?1:-1;for(let n=0;n<steps;n++)i=(i+dir+s.players.length)%s.players.length;return s.players[i]?.id||null;}
export function nextPlayer(s,from,steps=1){return stepIndex(s,from,steps);}
function top(s){return s.discardPile.at(-1)||null;}
function previousDiscard(s){return s.discardPile.length>1?s.discardPile.at(-2):null;}
function latestColored(s){for(let i=s.discardPile.length-1;i>=0;i--)if(s.discardPile[i].color)return s.discardPile[i].color;return null;}
function removeCard(p,cid){const i=p.hand.findIndex(c=>c.id===cid);return i<0?null:p.hand.splice(i,1)[0];}
function matchLetter(c,t,color){return c.letter===t?.letter||c.color===color;}
function validColor(c,color){return !!c.color&&c.color===color;}
function currentTarget(s){return s.pendingEffect?.targetPlayerId||s.currentPlayerId;}

export function initialState(players,settings={}){
 const deck=shuffle(makeDeck());
 const ps=players.map((p,i)=>({id:p.id,name:p.name,avatar:p.avatar||'🎪',seat:i,hand:[],connected:true,circusCalled:false}));
 const s={version:1,phase:'DEALING',players:ps,drawPile:deck,discardPile:[],currentPlayerId:ps[0]?.id||null,startPrivilege:ps[0]?.id||null,direction:'CW',currentColor:null,pendingEffect:null,insertWindow:null,lastDance:false,lastDancePasses:0,winnerId:null,result:null,resetInProgress:false,firstTurnComplete:false,turnStartedAt:Date.now(),settings:{turnTimerSeconds:Number(settings.turnTimerSeconds)||0}};
 for(let n=0;n<5;n++)for(const p of s.players)p.hand.push(s.drawPile.pop());
 while(s.drawPile.length){const c=s.drawPile.pop();if(c.type===TYPES.LETTER){s.discardPile.push(c);s.currentColor=c.color;break;}}
 s.phase='FIRST_TURN';
 return s;
}
export function visibleState(s,viewerId){const out=clone(s);for(const p of out.players){if(p.id!==viewerId)p.hand=p.hand.map(()=>({hidden:true}));}return out;}

function canInsert(s,pid,c){
 if(s.phase!=='INSERT_WINDOW'||!s.insertWindow?.active)return {ok:false,reason:'INSERT_WINDOW_CLOSED'};
 if(!s.firstTurnComplete)return {ok:false,reason:'INSERT_DISABLED_FIRST_TURN'};
 if(s.resetInProgress)return {ok:false,reason:'RESET_IN_PROGRESS'};
 if(!s.insertWindow.eligiblePlayers.includes(pid))return {ok:false,reason:'NOT_ELIGIBLE'};
 if(pid===s.insertWindow.sourcePlayerId)return {ok:false,reason:'CANNOT_INSERT_OWN_CARD'};
 const t=top(s);
 if([TYPES.JOKER,TYPES.JOKER_BACKWORD,TYPES.JOKER_X2].includes(c.type))return {ok:false,reason:'JOKER_NOT_INSERTABLE'};
 if(t?.type===TYPES.JOKER||t?.type===TYPES.JOKER_BACKWORD||t?.type===TYPES.JOKER_X2)return {ok:false,reason:'CANNOT_INSERT_ON_JOKER'};
 if(isPlusType(c.type)){
   if(!s.pendingEffect||s.pendingEffect.stackType!==c.type)return {ok:false,reason:'STACK_TYPE_MISMATCH'};
   if(c.type===TYPES.DRAW_FOUR)return {ok:true};
   return validColor(c,s.pendingEffect.color)?{ok:true}:{ok:false,reason:'COLOR_MISMATCH'};
 }
 if(c.type===TYPES.BACKWORD){
   if(s.pendingEffect)return validColor(c,s.pendingEffect.color)?{ok:true}:{ok:false,reason:'COLOR_MISMATCH'};
   return validColor(c,s.currentColor)?{ok:true}:{ok:false,reason:'INVALID_INSERT'};
 }
 if(c.type===TYPES.SKIP)return validColor(c,s.currentColor)?{ok:true}:{ok:false,reason:'INVALID_INSERT'};
 if(c.type===TYPES.LETTER){return {ok:c.letter===t?.letter&&c.color===s.currentColor,reason:'INSERT_REQUIRES_EXACT_LETTER_COLOR'};}
 return {ok:false,reason:'INVALID_INSERT'};
}

export function canPlayCard(s,pid,cid,{insert=false,chosenColor=null}={}){
 if(s.phase==='GAME_FINISHED')return {ok:false,reason:'GAME_FINISHED'};
 if(s.resetInProgress)return {ok:false,reason:'RESET_IN_PROGRESS'};
 const p=player(s,pid);if(!p)return {ok:false,reason:'PLAYER_NOT_FOUND'};
 const c=p.hand.find(x=>x.id===cid);if(!c)return {ok:false,reason:'CARD_NOT_OWNED'};
 if(insert)return canInsert(s,pid,c);
 if(!['FIRST_TURN','PLAYING','INSERT_WINDOW','LAST_DANCE'].includes(s.phase))return {ok:false,reason:'INVALID_PHASE'};
 if(s.phase!=='LAST_DANCE'&&pid!==s.currentPlayerId)return {ok:false,reason:'NOT_YOUR_TURN'};
 const t=top(s);
 if(c.type===TYPES.RESET_PLUS2_ALL)return {ok:true};
 if([TYPES.JOKER,TYPES.JOKER_BACKWORD,TYPES.JOKER_X2].includes(c.type))return {ok:true};
 if(s.phase==='LAST_DANCE'){
   if(c.type===TYPES.DRAW_FOUR)return {ok:true};
   if(isPlusType(c.type))return {ok:!s.pendingEffect||s.pendingEffect.stackType===c.type,reason:'STACK_TYPE_MISMATCH'};
   if(c.type===TYPES.BACKWORD||c.type===TYPES.SKIP)return {ok:!s.pendingEffect&&validColor(c,s.currentColor),reason:'MUST_MATCH_COLOR'};
   if(c.type===TYPES.LETTER)return {ok:!s.pendingEffect&&matchLetter(c,t,s.currentColor),reason:'INVALID_CARD'};
 }
 if(c.type===TYPES.DRAW_FOUR){
   if(s.pendingEffect&&s.pendingEffect.stackType!==TYPES.DRAW_FOUR)return {ok:false,reason:'STACK_TYPE_MISMATCH'};
   return {ok:true};
 }
 if(isPlusType(c.type)){
   if(s.pendingEffect&&s.pendingEffect.stackType!==c.type)return {ok:false,reason:'STACK_TYPE_MISMATCH'};
   if(s.pendingEffect)return validColor(c,s.pendingEffect.color)?{ok:true}:{ok:false,reason:'COLOR_MISMATCH'};
   return {ok:!t||c.color===s.currentColor||c.type===t.type||c.color===t.color,reason:'INVALID_CARD'};
 }
 if(c.type===TYPES.BACKWORD){
   if(s.pendingEffect)return validColor(c,s.pendingEffect.color)?{ok:true}:{ok:false,reason:'COLOR_MISMATCH'};
   return {ok:validColor(c,s.currentColor),reason:'MUST_MATCH_COLOR'};
 }
 if(c.type===TYPES.SKIP){return {ok:!s.pendingEffect&&validColor(c,s.currentColor),reason:'MUST_MATCH_COLOR'};}
 if(c.type===TYPES.LETTER)return {ok:!s.pendingEffect&&matchLetter(c,t,s.currentColor),reason:'INVALID_CARD'};
 return {ok:false,reason:'INVALID_CARD'};
}

function setPlus(s,c,actor){
 const base=s.pendingEffect?.amount||0;
 const amount=base+plusAmount(c.type);
 s.pendingEffect={type:'PLUS',stackType:c.type,amount,color:c.type===TYPES.DRAW_FOUR?(s.currentColor||null):c.color,sourcePlayerId:actor,targetPlayerId:stepIndex(s,actor)};
}
function resolveCopiedAbility(s,source,actor){
 if(!source)return;
 if(isPlusType(source.type))setPlus(s,source,actor);
 else if(source.type===TYPES.BACKWORD){s.direction=s.direction==='CW'?'CCW':'CW';}
 else if(source.type===TYPES.SKIP){s.currentPlayerId=stepIndex(s,actor,2);}
}
function executeAbility(s,c,actor,chosenColor){
 if(c.type===TYPES.DOUBLE||c.type===TYPES.TRIPLE){setPlus(s,c,actor);return;}
 if(c.type===TYPES.DRAW_FOUR){s.currentColor=chosenColor||s.currentColor;s.pendingEffect={type:'PLUS',stackType:TYPES.DRAW_FOUR,amount:plusAmount(c.type)+(s.pendingEffect?.stackType===TYPES.DRAW_FOUR?s.pendingEffect.amount:0),color:s.currentColor,sourcePlayerId:actor,targetPlayerId:stepIndex(s,actor)};return;}
 if(c.type===TYPES.BACKWORD){s.direction=s.direction==='CW'?'CCW':'CW';if(s.pendingEffect)s.pendingEffect.targetPlayerId=stepIndex(s,actor);else s.currentPlayerId=stepIndex(s,actor);return;}
 if(c.type===TYPES.SKIP){s.currentPlayerId=stepIndex(s,actor,2);return;}
 if(c.type===TYPES.JOKER||c.type===TYPES.JOKER_BACKWORD||c.type===TYPES.JOKER_X2){
   const latest=previousDiscard(s); if(latest){
     const times=c.type===TYPES.JOKER_X2?2:1;
     for(let i=0;i<times;i++)resolveCopiedAbility(s,latest,actor);
   }
   if(c.type===TYPES.JOKER_BACKWORD){s.direction=s.direction==='CW'?'CCW':'CW';if(s.pendingEffect)s.pendingEffect.targetPlayerId=stepIndex(s,actor);else s.currentPlayerId=stepIndex(s,actor);}
 }
}
function openInsert(s,sourceId){
 const source=indexOf(s,sourceId);
 s.insertWindow={active:true,sourcePlayerId:sourceId,eligiblePlayers:s.players.filter((p,i)=>p.connected&&i!==source).map(p=>p.id),openedAt:Date.now()};
 s.phase='INSERT_WINDOW';
}
function advance(s,from){s.firstTurnComplete=true;s.currentPlayerId=stepIndex(s,from);s.turnStartedAt=Date.now();s.phase='PLAYING';s.insertWindow=null;}
function drawCards(s,p,n){for(let i=0;i<n;i++){if(!s.drawPile.length)break;p.hand.push(s.drawPile.pop());}}
function enterLastDance(s){s.lastDance=true;s.phase='LAST_DANCE';s.pendingEffect=null;s.insertWindow=null;s.currentPlayerId=s.currentPlayerId||s.startPrivilege;}
function hasPlayableCard(s,pid){const p=player(s,pid);return !!p?.hand.some(c=>canPlayCard(s,pid,c.id).ok);}

function resetPlus2All(s,actor){
 // Rule order: everyone except actor draws 2; then collect discard + draw pile; shuffle; reveal a LETTER only.
 for(const p of s.players)if(p.id!==actor)drawCards(s,p,2);
 const pool=[...s.discardPile,...s.drawPile];s.discardPile=[];s.drawPile=shuffle(pool);
 s.pendingEffect=null;s.insertWindow=null;s.resetInProgress=true;
 let start=null;const revealed=[];
 while(s.drawPile.length){const c=s.drawPile.pop();revealed.push(c);if(c.type===TYPES.LETTER){start=c;break;}}
 if(!start){
   // Reset has no usable starting letter: restore all revealed cards and enter LAST DANCE.
   s.drawPile=shuffle([...s.drawPile,...revealed]);s.resetInProgress=false;enterLastDance(s);return;
 }
 // Revealed specials have no ability and remain out of play for this opening search.
 s.discardPile=[start];s.currentColor=start.color;s.currentPlayerId=stepIndex(s,actor);s.turnStartedAt=Date.now();s.phase='PLAYING';s.resetInProgress=false;
}

export function applyAction(state,pid,action){
 const s=clone(state);const p=player(s,pid);if(!p)throw new Error('PLAYER_NOT_FOUND');
 if(action.type==='CALL_CIRCUS'){
   if(s.phase==='GAME_FINISHED'||s.resetInProgress)throw new Error('CIRCUS_NOT_AVAILABLE');
   const targetId=action.targetPlayerId||pid;const target=player(s,targetId);
   if(!target||target.hand.length!==1)throw new Error('CIRCUS_TARGET_NOT_AT_ONE');
   if(target.circusCalled)throw new Error('CIRCUS_ALREADY_CALLED');
   if(targetId===pid){target.circusCalled=true;return s;}
   drawCards(s,target,5);target.circusCalled=true;return s;
 }
 if(action.type==='PASS'){if(s.phase!=='LAST_DANCE'||pid!==s.currentPlayerId)throw new Error('PASS_ONLY_LAST_DANCE');if(hasPlayableCard(s,pid))throw new Error('PLAYABLE_CARD_EXISTS');s.lastDancePasses=(s.lastDancePasses||0)+1;if(s.lastDancePasses>=s.players.length){s.winnerId=null;s.phase='GAME_FINISHED';s.insertWindow=null;return s;}advance(s,pid);s.phase='LAST_DANCE';return s;}
 if(action.type==='DRAW_CARD'){
   if(!['FIRST_TURN','PLAYING','INSERT_WINDOW'].includes(s.phase)||pid!==s.currentPlayerId)throw new Error('DRAW_NOT_ALLOWED');
   if(s.phase==='INSERT_WINDOW')s.insertWindow=null,s.phase='PLAYING';
   if(s.pendingEffect){const n=s.pendingEffect.amount;drawCards(s,p,n);s.pendingEffect=null;advance(s,pid);return s;}
   if(!s.drawPile.length){enterLastDance(s);return s;}
   drawCards(s,p,1);advance(s,pid);return s;
 }
 if(action.type==='PLAY_CARD'||action.type==='INSERT_CARD'){
   const insert=action.type==='INSERT_CARD';if(!insert&&s.phase==='INSERT_WINDOW'&&s.currentPlayerId===pid)s.insertWindow=null,s.phase='PLAYING';const check=canPlayCard(s,pid,action.cardId,{insert,chosenColor:action.chosenColor});if(!check.ok)throw new Error(check.reason);
   const c=removeCard(p,action.cardId);s.discardPile.push(c);if(c.color)s.currentColor=c.color;
   if(c.type===TYPES.DRAW_FOUR){if(!COLORS.includes(action.chosenColor))throw new Error('DRAW_FOUR_COLOR_REQUIRED');s.currentColor=action.chosenColor;}
   if(c.type===TYPES.RESET_PLUS2_ALL){
     if(s.phase==='LAST_DANCE'){
       s.lastDancePasses=0;s.currentPlayerId=stepIndex(s,pid);s.phase='LAST_DANCE';s.insertWindow=null;
       return s;
     }
     resetPlus2All(s,pid);return s;
   }
   const first=s.phase==='FIRST_TURN';const wasLastDance=s.phase==='LAST_DANCE';s.lastDancePasses=0;executeAbility(s,c,pid,action.chosenColor);
   if(p.hand.length===0){s.winnerId=pid;s.phase='GAME_FINISHED';s.insertWindow=null;return s;}
   if(p.hand.length===1)p.circusCalled=false;
   if(first){advance(s,pid);return s;}
   if(wasLastDance){s.currentPlayerId=stepIndex(s,pid);s.phase='LAST_DANCE';s.insertWindow=null;return s;}
   // A played card opens a race window. The target of any plus is recalculated after each insert.
   if(s.pendingEffect)s.currentPlayerId=s.pendingEffect.targetPlayerId;
   else s.currentPlayerId=stepIndex(s,pid);
   openInsert(s,pid);
   return s;
 }
 throw new Error('UNKNOWN_ACTION');
}

export function validateAction(state,pid,action){
 try{
  if(action.type==='PLAY_CARD')return canPlayCard(state,pid,action.cardId,{chosenColor:action.chosenColor});
  if(action.type==='INSERT_CARD')return canPlayCard(state,pid,action.cardId,{insert:true,chosenColor:action.chosenColor});
  if(action.type==='DRAW_CARD')return {ok:['FIRST_TURN','PLAYING','INSERT_WINDOW'].includes(state.phase)&&state.currentPlayerId===pid,reason:'NOT_YOUR_TURN'};
  if(action.type==='PASS'){if(state.phase!=='LAST_DANCE'||state.currentPlayerId!==pid)return {ok:false,reason:'PASS_NOT_ALLOWED'};if(hasPlayableCard(state,pid))return {ok:false,reason:'PLAYABLE_CARD_EXISTS'};return {ok:true};}
  if(action.type==='CALL_CIRCUS'){const targetId=action.targetPlayerId||pid;const target=state.players.find(p=>p.id===targetId);if(!target||target.hand.length!==1)return {ok:false,reason:'CIRCUS_TARGET_NOT_AT_ONE'};if(target.circusCalled)return {ok:false,reason:'CIRCUS_ALREADY_CALLED'};return {ok:true};}
  return {ok:false,reason:'UNKNOWN_ACTION'};
 }catch(e){return {ok:false,reason:e.message};}
}

export function scoreGame(s){
 const ordered=s.players.map(p=>({userId:p.id,cards:p.hand.length}));
 if(s.lastDance && !s.winnerId){
   const sorted=ordered.slice().sort((a,b)=>a.cards-b.cards);
   const third=sorted[2]?.cards;
   return ordered.map(x=>({...x,points:third!==undefined&&x.cards<=third?1:0,rank:sorted.findIndex(y=>y.userId===x.userId)+1,win:0}));
 }
 if(s.winnerId){
   const rest=ordered.filter(x=>x.userId!==s.winnerId).sort((a,b)=>a.cards-b.cards);
   const distinct=[...new Set(rest.map(x=>x.cards))];
   const secondDifference=distinct[0];
   return ordered.map(x=>{
     if(x.userId===s.winnerId)return {...x,points:3,rank:1,win:1};
     const bonus=secondDifference!==undefined&&x.cards===secondDifference?1:0;
     return {...x,points:bonus,rank:1+(distinct.indexOf(x.cards)+1),win:0};
   });
 }
 const sorted=ordered.slice().sort((a,b)=>a.cards-b.cards);
 const third=sorted[2]?.cards;
 return ordered.map(x=>({...x,points:third!==undefined&&x.cards<=third?1:0,rank:sorted.findIndex(y=>y.userId===x.userId)+1,win:0}));
}
