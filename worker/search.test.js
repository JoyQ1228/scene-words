import {test} from 'node:test';
import assert from 'node:assert/strict';
import {candidates, validateMatches} from './search.js';
const rows=[{id:1,english:'Do not be afraid.',chinese:'别害怕'},{id:2,english:'Hello.',chinese:'你好'}];
test('expansion retrieves related actual subtitle',()=>assert.equal(candidates(rows,['afraid'])[0].id,1));
test('model cannot invent IDs, rewrite quotes, duplicate or force low relevance',()=>{
 const matches=validateMatches([{id:99,score:1,reason:'fake'},{id:1,score:.9,reason:'面对害怕',english:'invented'},{id:1,score:1,reason:'duplicate'},{id:2,score:.3,reason:'weak'}],rows);
 assert.deepEqual(matches,[{id:1,reason:'面对害怕'}]);
});
