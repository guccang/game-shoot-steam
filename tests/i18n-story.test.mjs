// 剧情本地化回归：角色译名可改、可重名，存档与发言锚点始终使用稳定 ID。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {storyDefinition} from '../src/core/story/story-definition.js';
import {validateStoryDefinition} from '../src/core/story/story-schema.js';
import {storyDialogueEntries,storyDialogueLines} from '../src/core/story/story-journey.js';
import {storySpeechInfo,storyCueInfo} from '../src/rendering/story-guidance.js';

test('全部章节对白及变体只引用稳定人物 ID',()=>{
  for(const def of Object.values(STORY_CAMPAIGN)){
    assert.equal(validateStoryDefinition(def),def);
    const renamed=structuredClone(def);for(const actor of Object.values(renamed.actors))actor.name='Same translated name';
    assert.equal(validateStoryDefinition(renamed),renamed);
    renamed.dialogues[renamed.entry.dialogue].lines[0][0]='Same translated name';
    assert.throws(()=>validateStoryDefinition(renamed));
  }
});
test('重名译文不改变对白与短气泡的身体锚点',()=>{
  const game=new Game(freshProgress(),()=>.5);game.start();game.enterStory();
  const def=storyDefinition(game),names=Object.fromEntries(Object.entries(def.actors).map(([id,a])=>[id,a.name]));
  const entries=storyDialogueEntries(game.story,game.story.dialogue),before=entries.map((_,line)=>{game.story.line=line;return storySpeechInfo(game);});
  try{
    for(const actor of Object.values(def.actors))actor.name='Same translated name';
    assert.deepEqual(storyDialogueEntries(game.story,game.story.dialogue),entries);
    for(const [line,[speakerId,text]]of entries.entries()){
      game.story.line=line;const info=storySpeechInfo(game);
      assert.equal(info.speakerId,speakerId);assert.equal(info.speaker,'Same translated name');assert.equal(info.text,text);
      assert.deepEqual(info.anchor,before[line].anchor);assert.deepEqual(info.speakers,before[line].speakers);
    }
    assert.ok(storyDialogueLines(game.story,game.story.dialogue).every(([name])=>name==='Same translated name'));
    game.story.activeCue={speaker:'recording',text:'Test'};const cue=storyCueInfo(game);
    assert.equal(cue.speakerId,'recording');assert.equal(cue.anchor.x,def.world.sites.SIGN.x);
  }finally{for(const [id,name]of Object.entries(names))def.actors[id].name=name;}
});
