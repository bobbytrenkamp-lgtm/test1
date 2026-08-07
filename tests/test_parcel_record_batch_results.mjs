/* tests/test_parcel_record_batch_results.mjs — unit tests for
   data/parcel_pipeline/record_batch_results.mjs's summarizeOutcome(), the
   pure function deciding what standardized note/status update a target's
   real discovery outcome gets written to its catalog record.

   Run:  node tests/test_parcel_record_batch_results.mjs
*/
import { summarizeOutcome } from '../data/parcel_pipeline/record_batch_results.mjs';

let pass = 0, fail = 0;
function ok(name, cond) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

const target = { fips: '99999', name: 'Test County', status: 'complete' };
const today = '2026-08-07';

{
  const out = summarizeOutcome(target, null, { approved: false, reason: 'n/a' }, today);
  ok('no candidate -> status rejected', out.status === 'rejected');
  ok('no candidate -> rejection_reason set', !!out.rejection_reason);
  ok('note mentions no candidate found', /no candidate found/.test(out.note));
  ok('note is dated', out.note.startsWith(today));
}

{
  const candidate = { candidateId: 'x', rejected: true, rejectReason: 'wrong-jurisdiction' };
  const out = summarizeOutcome(target, candidate, { approved: false, reason: 'n/a' }, today);
  ok('rejected candidate -> status rejected', out.status === 'rejected');
  ok('rejection_reason cites the real reject reason', out.rejection_reason.includes('wrong-jurisdiction'));
}

{
  const candidate = { candidateId: 'x', rejected: false, score: 80, band: 'good' };
  const out = summarizeOutcome(target, candidate, { approved: true, reason: null }, today);
  ok('approved candidate -> status candidate (promotion itself is promote_batch.mjs\'s job)', out.status === 'candidate');
  ok('approved note mentions clearing every gate', /cleared every promotion gate/.test(out.note));
  ok('no rejection_reason when approved', out.rejection_reason === null);
}

{
  const candidate = { candidateId: '37063-x', rejected: false, score: 44, band: 'weak' };
  const evaluation = { approved: false, reason: "2 unresolved requiresReview item(s) (pin, address)" };
  const out = summarizeOutcome(target, candidate, evaluation, today);
  ok('not-approved-but-real-candidate -> status stays candidate (never rejected outright)', out.status === 'candidate');
  ok('note includes the real candidateId', out.note.includes('37063-x'));
  ok('note includes the real score/band', out.note.includes('score 44') && out.note.includes('band weak'));
  ok('note includes the exact promotion-gate rejection reason', out.note.includes(evaluation.reason));
  ok('no rejection_reason for a real (if imperfect) candidate', out.rejection_reason === null);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
