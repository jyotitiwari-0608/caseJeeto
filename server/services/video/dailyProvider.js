// Requires: npm install axios
// Single point of contact with Daily.co, same abstraction pattern as
// services/storage/cloudinaryStorage.js — callers never touch the Daily
// API directly, so swapping providers later means rewriting only this file.

const axios = require('axios');

const daily = axios.create({
  baseURL: 'https://api.daily.co/v1',
  headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` },
});

// Creates a private, time-boxed room for one booking. `exp` (Unix seconds)
// auto-expires the room shortly after the consultation should have ended,
// so stale rooms don't accumulate on the Daily dashboard.
exports.createRoom = async (booking) => {
  const scheduledAt = new Date(booking.scheduledAt);
  const expiresAt = new Date(scheduledAt.getTime() + (booking.durationMinutes + 30) * 60 * 1000);

  const { data } = await daily.post('/rooms', {
    name: `booking-${booking._id}`,
    privacy: 'private',
    properties: {
      exp: Math.floor(expiresAt.getTime() / 1000),
      enable_chat: true,
      enable_screenshare: true,
      max_participants: 2,
      eject_at_room_exp: true,
    },
  });

  return { url: data.url, name: data.name };
};

// Meeting tokens scope who can join a private room and for how long.
// isOwner grants the lawyer host controls (e.g. ending the call for
// everyone); the client gets a plain participant token.
exports.createMeetingToken = async (
  roomName,
  { userId, name, isOwner = false, expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000) }
) => {
  const { data } = await daily.post('/meeting-tokens', {
    properties: {
      room_name: roomName,
      user_id: String(userId),
      user_name: name,
      is_owner: isOwner,
      exp: Math.floor(new Date(expiresAt).getTime() / 1000),
    },
  });
  return data.token;
};

exports.deleteRoom = async (roomName) => {
  try {
    await daily.delete(`/rooms/${roomName}`);
  } catch (err) {
    // Room already gone / never existed — not worth failing the caller over.
    if (err.response?.status !== 404) throw err;
  }
};
