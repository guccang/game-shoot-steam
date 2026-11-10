// 地区服务屋权限和商路旧档兼容专项检查。
import test from 'node:test';import assert from 'node:assert/strict';
import {REGIONAL_CAMPS} from '../src/config/regional-camps.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {TRADE_STATIONS} from '../src/config/camp-trade.js';
import {regionalCampHere} from '../src/core/camp/regional-camp-access.js';
import {worldDistance} from '../src/world/coordinates.js';
import {worldBuildingBlocked} from '../src/world/building-collision.js';

test('五条商路均位于对应友善营地内并保留原线路编号',()=>{assert.equal(TRADE_STATIONS.length,5);assert.deepEqual(TRADE_STATIONS.slice(0,2).map(s=>s.id),['trade-relay','trade-amber']);for(const c of REGIONAL_CAMPS){const s=TRADE_STATIONS.find(s=>s.camp===c.id);assert.ok(worldDistance(c,s)<350);assert.equal(worldBuildingBlocked(s.x,s.y,12,{mapId:'forest'}),false);}});
test('室内只能办理所属营地业务，外部落点用于现场核验',()=>{for(const room of Object.values(WORKSHOP_INTERIORS).filter(r=>r.regional)){const g={mapId:'forest',state:'paused',player:{...room.spawn,hp:100},cottage:{kind:room.id,outside:room.outside}};assert.equal(regionalCampHere(g)?.id,room.regional);assert.equal(!!regionalCampHere(g,REGIONAL_CAMPS.find(c=>c.id!==room.regional).id),false);g.cottage.kind='cottage';assert.equal(!!regionalCampHere(g),false);}});
