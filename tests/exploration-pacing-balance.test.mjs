// 工作台通关条件只包含必经阶段；可选体验缺席不会让报告永远未完成。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress} from '../src/progression/progress.js';
import {CAMPAIGN_TASK_IDS} from '../src/config/mainline-pacing.js';
import {simulateEconomy} from '../src/balance/model.js';
import {RECOMMENDED_ECONOMY} from '../src/config/economy.js';
import {nativeVehicleWeapon} from '../src/config/vehicle-armaments.js';
test('工作台将八阶段完成视作主线结束，不要求四十项自选体验',()=>{
 const p=freshProgress();p.mainline.completed=[...CAMPAIGN_TASK_IDS];p.mainline.phase='complete';
 p.weapons[0]=15;p.heroes[0]=12;p.vehicleIndex=0;p.vehicleHulls[0]=10;p.vehicleWeapons[nativeVehicleWeapon(0).weaponIndex]=12;p.vehicleLoadouts[0]=nativeVehicleWeapon(0).weaponIndex;
 const result=simulateEconomy(1,RECOMMENDED_ECONOMY,{minutes:1,initial:p,route:[['weapons',0]],failureRate:0});
 assert.equal(result.completed,true);assert.equal(result.mainlineCompleted,8);
});
