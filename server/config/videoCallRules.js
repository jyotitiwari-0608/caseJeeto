// server/config/videoCallRules.js
// Business rule: a video consultation must never run longer than 15
// minutes on the call itself, regardless of how long a slot the client
// booked and paid for (Booking.durationMinutes / Availability slot length
// are unaffected — this only caps the live video session).
//
// This constant is imported in exactly two places, and both must use it
// (never a locally hard-coded "15"), or the two enforcement layers below
// can drift apart silently:
//   1. services/video/dailyProvider.js — sets the Daily ROOM's `exp`.
//      Combined with `eject_at_room_exp: true`, Daily itself force-ejects
//      every participant still connected once the room expires.
//   2. controllers/consultationController.js — sets the MEETING TOKEN's
//      `exp` to the same absolute time. Daily's client SDK disconnects a
//      participant once their token expires, independently of the room.
// Two independent enforcement points on purpose: if one is ever
// misconfigured, the other still cuts the call off on time.
const MAX_CALL_MINUTES = 15;

// Unrelated to the cap above — how early a participant may request a
// token before the scheduled time, to join a waiting room / test
// audio-video before the consultation officially starts.
const EARLY_JOIN_MINUTES = 15;

module.exports = { MAX_CALL_MINUTES, EARLY_JOIN_MINUTES };
