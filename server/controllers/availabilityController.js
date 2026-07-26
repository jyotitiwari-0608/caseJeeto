// availabilityController.js
const Availability = require('../models/availibility');
const Lawyer = require('../models/lawyer');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { MIN_BOOKING_MINUTES, MAX_BOOKING_MINUTES } = require('../utils/bookingRules');

function toUtcMidnight(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    throw new AppError('Invalid date.', 400);
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseSlot(slot, normalizedDate) {
  if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
    throw new AppError('Each slot must include valid startTime and endTime values.', 400);
  }

  const startTime = new Date(slot.startTime);
  const endTime = new Date(slot.endTime);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new AppError('Each slot must include valid startTime and endTime values.', 400);
  }
  if (startTime >= endTime) {
    throw new AppError('A slot startTime must be before its endTime.', 400);
  }
  if (startTime <= new Date()) {
    throw new AppError('Availability slots must start in the future.', 400);
  }
  const durationMinutes = (endTime - startTime) / 60000;
  if (!Number.isInteger(durationMinutes) ||
      durationMinutes < MIN_BOOKING_MINUTES || durationMinutes > MAX_BOOKING_MINUTES) {
    throw new AppError(
      `Availability slots must be between ${MIN_BOOKING_MINUTES} and ${MAX_BOOKING_MINUTES} whole minutes.`,
      400
    );
  }
  if (toUtcMidnight(startTime).getTime() !== normalizedDate.getTime() ||
      toUtcMidnight(endTime).getTime() !== normalizedDate.getTime()) {
    throw new AppError('Availability slots must start and end on the selected UTC date.', 400);
  }

  return { startTime, endTime, isBooked: false, bookingId: null };
}

function assertNoOverlaps(slots) {
  const ordered = [...slots].sort((a, b) => a.startTime - b.startTime);
  for (let i = 1; i < ordered.length; i += 1) {
    if (ordered[i].startTime < ordered[i - 1].endTime) {
      throw new AppError('Availability slots cannot overlap or be duplicated.', 409);
    }
  }
}

// Every handler below needs the Lawyer PROFILE id (not req.user.userId)
// because Availability.lawyerId refs 'Lawyer', not 'User'. Resolve it
// once per request instead of assuming req.user.userId is interchangeable.
async function resolveLawyerProfile(req) {
  const lawyer = await Lawyer.findOne({ userId: req.user.userId });
  if (!lawyer) throw new AppError('Lawyer profile not found.', 404);
  return lawyer;
}

// POST /api/lawyers/me/availability
exports.setAvailability = asyncHandler(async (req, res) => {
  const lawyer = await resolveLawyerProfile(req);
  const { date, slots } = req.body;

  if (!date || !Array.isArray(slots) || slots.length === 0) {
    throw new AppError('date and a non-empty slots array are required.', 400);
  }
  if (slots.length > 100) {
    throw new AppError('A maximum of 100 slots can be added at once.', 400);
  }

  const normalizedDate = toUtcMidnight(date);
  const newSlots = slots.map((slot) => parseSlot(slot, normalizedDate));

  assertNoOverlaps(newSlots);
  const appendWithoutOverlap = () => Availability.findOneAndUpdate(
    {
      lawyerId: lawyer._id,
      date: normalizedDate,
      $and: newSlots.map((slot) => ({
        slots: {
          $not: {
            $elemMatch: {
              startTime: { $lt: slot.endTime },
              endTime: { $gt: slot.startTime },
            },
          },
        },
      })),
    },
    { $push: { slots: { $each: newSlots } } },
    { new: true, runValidators: true }
  );

  let availability = await appendWithoutOverlap();
  if (!availability) {
    const existing = await Availability.exists({ lawyerId: lawyer._id, date: normalizedDate });
    if (existing) {
      throw new AppError('Availability slots cannot overlap or be duplicated.', 409);
    }
    try {
      availability = await Availability.create({
        lawyerId: lawyer._id,
        date: normalizedDate,
        slots: newSlots,
      });
    } catch (err) {
      if (err?.code !== 11000) throw err;
      availability = await appendWithoutOverlap();
      if (!availability) {
        throw new AppError('Availability slots cannot overlap or be duplicated.', 409);
      }
    }
  }

  return sendSuccess(res, 201, { availability });
});

// GET /api/lawyers/me/availability?from=&to=
exports.getMyAvailability = asyncHandler(async (req, res) => {
  const lawyer = await resolveLawyerProfile(req);
  const { from, to } = req.query;

  const filter = { lawyerId: lawyer._id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = toUtcMidnight(from);
    if (to) filter.date.$lte = toUtcMidnight(to);
    if (filter.date.$gte && filter.date.$lte && filter.date.$gte > filter.date.$lte) {
      throw new AppError('from must be before or equal to to.', 400);
    }
  }

  const availability = await Availability.find(filter).sort({ date: 1 });
  return sendSuccess(res, 200, { availability });
});

// PATCH /api/lawyers/me/availability/:availabilityId/slots/:slotId
exports.updateSlot = asyncHandler(async (req, res) => {
  const lawyer = await resolveLawyerProfile(req);
  const { availabilityId, slotId } = req.params;

  const availability = await Availability.findOne({ _id: availabilityId, lawyerId: lawyer._id });
  if (!availability) {
    throw new AppError('Availability not found.', 404);
  }

  const slot = availability.slots.id(slotId);
  if (!slot) {
    throw new AppError('Slot not found.', 404);
  }
  if (slot.isBooked) {
    throw new AppError('Cannot edit a slot that is already booked.', 409);
  }

  if (req.body.startTime === undefined && req.body.endTime === undefined) {
    throw new AppError('startTime or endTime is required.', 400);
  }

  const candidate = parseSlot(
    {
      startTime: req.body.startTime ?? slot.startTime,
      endTime: req.body.endTime ?? slot.endTime,
    },
    availability.date
  );
  assertNoOverlaps([
    ...availability.slots.filter((other) => !other._id.equals(slot._id)),
    candidate,
  ]);

  const updated = await Availability.findOneAndUpdate(
    {
      _id: availabilityId,
      lawyerId: lawyer._id,
      slots: {
        $elemMatch: {
          _id: slotId,
          isBooked: false,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      },
      $and: [{
        slots: {
          $not: {
            $elemMatch: {
              _id: { $ne: slot._id },
              startTime: { $lt: candidate.endTime },
              endTime: { $gt: candidate.startTime },
            },
          },
        },
      }],
    },
    {
      $set: {
        'slots.$[target].startTime': candidate.startTime,
        'slots.$[target].endTime': candidate.endTime,
      },
    },
    {
      new: true,
      runValidators: true,
      arrayFilters: [{ 'target._id': slot._id, 'target.isBooked': false }],
    }
  );
  if (!updated) {
    throw new AppError('Slot changed, was booked, or now overlaps another slot.', 409);
  }
  return sendSuccess(res, 200, { availability: updated });
});

// DELETE /api/lawyers/me/availability/:availabilityId/slots/:slotId
exports.deleteSlot = asyncHandler(async (req, res) => {
  const lawyer = await resolveLawyerProfile(req);
  const { availabilityId, slotId } = req.params;

  const availability = await Availability.findOneAndUpdate(
    {
      _id: availabilityId,
      lawyerId: lawyer._id,
      slots: { $elemMatch: { _id: slotId, isBooked: false } },
    },
    { $pull: { slots: { _id: slotId, isBooked: false } } },
    { new: true }
  );
  if (!availability) {
    const existing = await Availability.findOne({ _id: availabilityId, lawyerId: lawyer._id });
    if (!existing) throw new AppError('Availability not found.', 404);
    const slot = existing.slots.id(slotId);
    if (!slot) throw new AppError('Slot not found.', 404);
    throw new AppError('Cannot delete a slot that is already booked or changed.', 409);
  }

  return sendSuccess(res, 200, { message: 'Slot deleted.', availability });
});
// const Payment = require('../models/payment');

// // GET /api/lawyers/me/earnings
// exports.getMyEarnings = async (req, res) => {
//   try {
//     const lawyerId = req.user.userId;

//     const totals = await Payment.aggregate([
//       { $match: { lawyerId, paymentStatus: 'paid' } },
//       {
//         $group: {
//           _id: null,
//           totalEarned: { $sum: '$lawyerPayout' },
//           totalPaidOut: {
//             $sum: { $cond: [{ $eq: ['$payoutStatus', 'completed'] }, '$lawyerPayout', 0] },
//           },
//           totalPending: {
//             $sum: { $cond: [{ $ne: ['$payoutStatus', 'completed'] }, '$lawyerPayout', 0] },
//           },
//           consultationCount: { $sum: 1 },
//         },
//       },
//     ]);

//     const now = new Date();
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const thisMonth = await Payment.aggregate([
//       { $match: { lawyerId, paymentStatus: 'paid', createdAt: { $gte: startOfMonth } } },
//       { $group: { _id: null, amount: { $sum: '$lawyerPayout' }, count: { $sum: 1 } } },
//     ]);

//     return res.status(200).json({
//       allTime: totals[0] || { totalEarned: 0, totalPaidOut: 0, totalPending: 0, consultationCount: 0 },
//       thisMonth: thisMonth[0] || { amount: 0, count: 0 },
//     });
//   } catch (err) {
//     return res.status(500).json({ message: 'Could not fetch earnings.', error: err.message });
//   }
// };

// // GET /api/lawyers/me/payouts?status=&page=&limit=
// exports.getPayoutHistory = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;

//     const filter = { lawyerId: req.user.userId, paymentStatus: 'paid' };
//     if (status) filter.payoutStatus = status;

//     const payments = await Payment.find(filter)
//       .populate('bookingId', 'scheduledAt')
//       .populate('clientId', 'name')
//       .sort({ createdAt: -1 })
//       .skip((Number(page) - 1) * Number(limit))
//       .limit(Number(limit));

//     const total = await Payment.countDocuments(filter);

//     return res.status(200).json({ payments, page: Number(page), limit: Number(limit), total });
//   } catch (err) {
//     return res.status(500).json({ message: 'Could not fetch payout history.', error: err.message });
//   }
// };

// // GET /api/lawyers/me/payments/booking/:bookingId
// exports.getPaymentByBookingId = async (req, res) => {
//   try {
//     const payment = await Payment.findOne({
//       bookingId: req.params.bookingId,
//       lawyerId: req.user.userId,
//     });
//     if (!payment) {
//       return res.status(404).json({ message: 'Payment not found.' });
//     }
//     return res.status(200).json({ payment });
//   } catch (err) {
//     return res.status(500).json({ message: 'Could not fetch payment.', error: err.message });
//   }
// };
// const Availability = require('../models/availibility');

// // helper: normalize any date input to UTC midnight, matching the model's convention
// function toUtcMidnight(dateInput) {
//   const d = new Date(dateInput);
//   return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
// }

// // POST /api/lawyers/me/availability
// // body: { date: "2026-07-20", slots: [{ startTime: "2026-07-20T09:00:00Z", endTime: "2026-07-20T09:30:00Z" }, ...] }
// exports.setAvailability = async (req, res) => {
//   try {
//     const lawyerId = req.user.userId;
//     const { date, slots } = req.body;

//     if (!date || !Array.isArray(slots) || slots.length === 0) {
//       return res.status(400).json({ message: 'date and a non-empty slots array are required.' });
//     }

//     const normalizedDate = toUtcMidnight(date);

//     const newSlots = slots.map(s => ({
//       startTime: new Date(s.startTime),
//       endTime: new Date(s.endTime),
//       isBooked: false,
//       bookingId: null,
//     }));

//     // unique index on {lawyerId, date} — upsert so re-posting the same date appends slots
//     let availability = await Availability.findOne({ lawyerId, date: normalizedDate });

//     if (availability) {
//       availability.slots.push(...newSlots);
//       await availability.save();
//     } else {
//       availability = await Availability.create({
//         lawyerId,
//         date: normalizedDate,
//         slots: newSlots,
//       });
//     }

//     return res.status(201).json({ availability });
//   } catch (err) {
//     return res.status(500).json({ message: 'Could not set availability.', error: err.message });
//   }
// };

// // GET /api/lawyers/me/availability?from=2026-07-01&to=2026-07-31
// exports.getMyAvailability = async (req, res) => {
//   try {
//     const lawyerId = req.user.userId;
//     const { from, to } = req.query;

//     const filter = { lawyerId };
//     if (from || to) {
//       filter.date = {};
//       if (from) filter.date.$gte = toUtcMidnight(from);
//       if (to) filter.date.$lte = toUtcMidnight(to);
//     }

//     const availability = await Availability.find(filter).sort({ date: 1 });
//     return res.status(200).json({ availability });
//   } catch (err) {
//     return res.status(500).json({ message: 'Could not fetch availability.', error: err.message });
//   }
// };

// // PATCH /api/lawyers/me/availability/:availabilityId/slots/:slotId
// // body: { startTime?, endTime? }
// exports.updateSlot = async (req, res) => {
//   try {
//     const { availabilityId, slotId } = req.params;
//     const lawyerId = req.user.userId;

//     const availability = await Availability.findOne({ _id: availabilityId, lawyerId });
//     if (!availability) {
//       return res.status(404).json({ message: 'Availability not found.' });
//     }

//     const slot = availability.slots.id(slotId);
//     if (!slot) {
//       return res.status(404).json({ message: 'Slot not found.' });
//     }
//     if (slot.isBooked) {
//       return res.status(409).json({ message: 'Cannot edit a slot that is already booked.' });
//     }

//     if (req.body.startTime) slot.startTime = new Date(req.body.startTime);
//     if (req.body.endTime) slot.endTime = new Date(req.body.endTime);

//     await availability.save();
//     return res.status(200).json({ availability });
//   } catch (err) {
//     return res.status(500).json({ message: 'Could not update slot.', error: err.message });
//   }
// };

// // DELETE /api/lawyers/me/availability/:availabilityId/slots/:slotId
// exports.deleteSlot = async (req, res) => {
//   try {
//     const { availabilityId, slotId } = req.params;
//     const lawyerId = req.user.userId;

//     const availability = await Availability.findOne({ _id: availabilityId, lawyerId });
//     if (!availability) {
//       return res.status(404).json({ message: 'Availability not found.' });
//     }

//     const slot = availability.slots.id(slotId);
//     if (!slot) {
//       return res.status(404).json({ message: 'Slot not found.' });
//     }
//     if (slot.isBooked) {
//       return res.status(409).json({ message: 'Cannot delete a slot that is already booked.' });
//     }

//     slot.deleteOne();
//     await availability.save();

//     return res.status(200).json({ message: 'Slot deleted.' });
//   } catch (err) {
//     return res.status(500).json({ message: 'Could not delete slot.', error: err.message });
//   }
// };
