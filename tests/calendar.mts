import assert from 'node:assert/strict';
import {monthCells,monthStart,shiftMonth,collectPages} from '../lib/calendar.ts';
assert.equal(monthStart('2026-10-09'),'2026-10-01');
assert.equal(shiftMonth('2026-12-01',1),'2027-01-01');
assert.equal(shiftMonth('2026-01-01',-1),'2025-12-01');
const leap=monthCells('2024-02-01');
assert.equal(leap.filter(Boolean).length,29);
assert.equal(monthCells('2025-02-01').filter(Boolean).length,28);
assert.equal(monthCells('2026-02-01')[6],'2026-02-01'); // Sunday, Monday-first calendar.
assert.equal(monthCells('2026-06-01')[0],'2026-06-01');
assert.equal(monthCells('2026-03-01').length,42);
for(let m=1;m<=12;m++){const cells=monthCells(`2026-${String(m).padStart(2,'0')}-01`);assert.equal(cells.length%7,0);assert.equal(new Set(cells.filter(Boolean)).size,cells.filter(Boolean).length);}
const rows=Array.from({length:1203},(_,i)=>i);
const ranges:number[][]=[];
assert.deepEqual(await collectPages((from,to)=>{ranges.push([from,to]);return Promise.resolve({data:rows.slice(from,to+1),error:null});},new AbortController().signal),rows);
assert.deepEqual(ranges,[[0,499],[500,999],[1000,1499]]);
await assert.rejects(collectPages(()=>Promise.resolve({data:null,error:new Error('network')}),new AbortController().signal));
const abort=new AbortController();let calls=0;
await assert.rejects(collectPages(()=>{calls++;abort.abort();return Promise.resolve({data:rows.slice(0,500),error:null});},abort.signal));
assert.equal(calls,1);
console.log('Calendar: month boundaries, leap years, full pagination, error and cancellation checks passed.');
