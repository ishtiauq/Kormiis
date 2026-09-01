'use strict';

/**
 * Kormiis Cloud Functions — rule-based HR automation.
 *
 * No external AI. All logic is plain JavaScript over Firestore.
 *
 * Note: scheduled (onSchedule) jobs were removed because they require the
 * Blaze plan. Analysis runs on demand from the UI instead ("Run analysis" /
 * "Calculate month").
 *
 * Deploy: firebase deploy --only functions
 */

const { admin } = require('./common');
const { setGlobalOptions } = require('firebase-functions/v2');

// The frontend (src/services/hr.js) creates its callable client with this
// region. Without setting it here the SDK would default to us-central1 and
// every call from the app would 404.
setGlobalOptions({ region: 'asia-south1' });

admin.initializeApp();

const burnout = require('./burnout');
const gigs = require('./gigs');
const performance = require('./performance');
const push = require('./push');
const whatsapp = require('./whatsapp');

module.exports = {
  // Feature 1
  getBurnoutRisks: burnout.getBurnoutRisks,
  acknowledgeRiskAlert: burnout.acknowledgeRiskAlert,
  runBurnoutAnalysisNow: burnout.runBurnoutAnalysisNow,

  // Feature 2
  createGig: gigs.createGig,
  getOpenGigs: gigs.getOpenGigs,
  applyForGig: gigs.applyForGig,
  assignGig: gigs.assignGig,
  completeGig: gigs.completeGig,
  getMySkills: gigs.getMySkills,
  addSkill: gigs.addSkill,
  removeSkill: gigs.removeSkill,

  // Feature 5
  calculateMonthlyPerformance: performance.calculateMonthlyPerformance,
  getPerformanceScores: performance.getPerformanceScores,
  getMyScore: performance.getMyScore,
  getPerformanceTrends: performance.getPerformanceTrends,

  // Feature 8 — push notifications
  registerDeviceToken: push.registerDeviceToken,
  unregisterDeviceToken: push.unregisterDeviceToken,
  sendPush: push.sendPush,
  sendTestPush: push.sendTestPush,

  // Feature 9 — WhatsApp free notification gateway (Meta Cloud API)
  getWhatsAppSetupInfo: whatsapp.getWhatsAppSetupInfo,
  saveWhatsAppConfig: whatsapp.saveWhatsAppConfig,
  verifyWhatsAppConfig: whatsapp.verifyWhatsAppConfig,
  disconnectWhatsApp: whatsapp.disconnectWhatsApp,
  testWhatsApp: whatsapp.testWhatsApp,
  getWhatsAppLog: whatsapp.getWhatsAppLog,
  waWebhook: whatsapp.waWebhook,
  onWaOutboxCreated: whatsapp.onWaOutboxCreated,
};
