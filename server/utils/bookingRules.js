const AppError = require('./AppError');

const MIN_BOOKING_MINUTES = 5;
const MAX_BOOKING_MINUTES = 240;

function durationFromSlot(slot, requestedDuration) {
  const start = new Date(slot?.startTime);
  const end = new Date(slot?.endTime);
  const duration = (end.getTime() - start.getTime()) / 60000;
  if (!Number.isInteger(duration) || duration < MIN_BOOKING_MINUTES || duration > MAX_BOOKING_MINUTES) {
    throw new AppError(
      `Availability slots must be between ${MIN_BOOKING_MINUTES} and ${MAX_BOOKING_MINUTES} whole minutes.`,
      400
    );
  }
  if (requestedDuration !== undefined && Number(requestedDuration) !== duration) {
    throw new AppError('durationMinutes must match the selected availability slot.', 400);
  }
  return duration;
}

module.exports = { durationFromSlot, MIN_BOOKING_MINUTES, MAX_BOOKING_MINUTES };
