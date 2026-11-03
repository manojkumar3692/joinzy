import test from 'node:test';import assert from 'node:assert/strict';
import {campaignReviewSection,formatOfferDate,offerApprovalIssues} from '../lib/adminReview.mjs';
import {freshSeed} from '../lib/freshSeed.mjs';
test('unscheduled seeded campaigns use their actual scheduling flow, not empty date allocation',()=>{const s=freshSeed();for(const d of s.deals){assert.equal(campaignReviewSection(d),d.clpCampaign?'clp':'bakery');assert.deepEqual(offerApprovalIssues(s,d,[]),['Set the schedule in the dedicated campaign panel before publishing.']);}assert.equal(campaignReviewSection({categoryId:'ac'}),null);});
test('absent dates display a scheduling state, and Chennai dates use IST',()=>{for(const date of ['',undefined,'invalid'])assert.equal(formatOfferDate(date,'osian-chlorophyll'),'Awaiting scheduling');const text=formatOfferDate('2026-11-06T12:30:00Z','osian-chlorophyll');assert.match(text,/6:00 pm IST/i);assert.doesNotMatch(text,/Invalid Date/);});
