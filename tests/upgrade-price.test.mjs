// 验证原价说明与真实扣费同源，折扣资格退出后不残留促销文案。
import test from 'node:test';
import assert from 'node:assert/strict';
import { economyUpgradeQuote, economyUpgradeCost, upgradeHint, bindEconomy, RECOMMENDED_ECONOMY, ORIGINAL_ECONOMY } from '../src/config/economy.js';
import { freshProgress } from '../src/progression/progress.js';
import { upgradePriceMarkup } from '../src/ui/upgrade-price.js';

test('低级追赶同时给出35/14原价和11/5实际价格',()=>{
  const p=freshProgress();p.weapons[0]=4;p.weapons[3]=1;
  assert.deepEqual(economyUpgradeQuote(p,'weapons',3,1),{original:{coins:35,wood:14},cost:{coins:11,wood:5},discount:.3});
  assert.match(upgradeHint(p,'weapons',3,1),/追赶3折/);
  const markup=upgradePriceMarkup(p,'weapons',3,1);
  assert.match(markup,/原价/);assert.match(markup,/折后/);
  assert.match(markup,/35/);assert.match(markup,/11/);
});

test('退出追赶、跨类别、附属部件和旧版不显示折扣',()=>{
  const p=freshProgress();p.weapons[0]=4;p.weapons[3]=2;
  for(const args of [['weapons',3,2],['heroes',0,1],['weapons',3,1,'rate']]){
    const q=economyUpgradeQuote(p,...args);
    assert.equal(q.discount,1);assert.deepEqual(q.original,q.cost);
    assert.doesNotMatch(upgradePriceMarkup(p,...args),/原价|折后/);
    assert.doesNotMatch(upgradeHint(p,...args),/追赶/);
  }
  bindEconomy(p,ORIGINAL_ECONOMY);
  assert.equal(economyUpgradeQuote(p,'weapons',3,1).discount,1);
  assert.deepEqual(economyUpgradeCost(p,'weapons',3,2,'rate'),{coins:70,wood:30});
});

test('四类报价保留实际取整、封顶和自定义折扣，不倒推原价',()=>{
  for(const [kind,field] of [['weapons','weapons'],['heroes','heroes'],['turret','vehicleWeapons'],['vehicle','vehicleHulls']]){
    const c=structuredClone(RECOMMENDED_ECONOMY);c.upgrades.ceilings[kind]=450;
    const p=bindEconomy(freshProgress(),c);p[field][0]=20;p[field][1]=14;
    const q=economyUpgradeQuote(p,kind,1,14);
    assert.deepEqual(q.original,{coins:450,wood:180});
    assert.deepEqual(q.cost,{coins:135,wood:54});
    assert.deepEqual(economyUpgradeCost(p,kind,1,14),q.cost);
  }
  const config=structuredClone(RECOMMENDED_ECONOMY);config.upgrades.catchup=.65;
  const p=bindEconomy(freshProgress(),config);p.weapons[0]=4;
  assert.equal(economyUpgradeQuote(p,'weapons',3,1).cost.coins,23);
  assert.match(upgradeHint(p,'weapons',3,1),/追赶6.5折/);
  config.upgrades.catchup=1;
  bindEconomy(p,config);assert.doesNotMatch(upgradeHint(p,'weapons',3,1),/追赶/);
});
