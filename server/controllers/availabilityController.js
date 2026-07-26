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
const Availability = require('../models/availibility');

// helper: normalize any date input to UTC midnight, matching the model's convention
function toUtcMidnight(dateInput) {
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// POST /api/lawyers/me/availability
// body: { date: "2026-07-20", slots: [{ startTime: "2026-07-20T09:00:00Z", endTime: "2026-07-20T09:30:00Z" }, ...] }
exports.setAvailability = async (req, res) => {
  try {
    const lawyerId = req.user.userId;
    const { date, slots } = req.body;

    if (!date || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ message: 'date and a non-empty slots array are required.' });
    }

    const normalizedDate = toUtcMidnight(date);

    const newSlots = slots.map(s => ({
      startTime: new Date(s.startTime),
      endTime: new Date(s.endTime),
      isBooked: false,
      bookingId: null,
    }));

    // unique index on {lawyerId, date} — upsert so re-posting the same date appends slots
    let availability = await Availability.findOne({ lawyerId, date: normalizedDate });

    if (availability) {
      availability.slots.push(...newSlots);
      await availability.save();
    } else {
      availability = await Availability.create({
        lawyerId,
        date: normalizedDate,
        slots: newSlots,
      });
    }

    return res.status(201).json({ availability });
  } catch (err) {
    return res.status(500).json({ message: 'Could not set availability.', error: err.message });
  }
};

// GET /api/lawyers/me/availability?from=2026-07-01&to=2026-07-31
exports.getMyAvailability = async (req, res) => {
  try {
    const lawyerId = req.user.userId;
    const { from, to } = req.query;

    const filter = { lawyerId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = toUtcMidnight(from);
      if (to) filter.date.$lte = toUtcMidnight(to);
    }

    const availability = await Availability.find(filter).sort({ date: 1 });
    return res.status(200).json({ availability });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch availability.', error: err.message });
  }
};

// PATCH /api/lawyers/me/availability/:availabilityId/slots/:slotId
// body: { startTime?, endTime? }
exports.updateSlot = async (req, res) => {
  try {
    const { availabilityId, slotId } = req.params;
    const lawyerId = req.user.userId;

    const availability = await Availability.findOne({ _id: availabilityId, lawyerId });
    if (!availability) {
      return res.status(404).json({ message: 'Availability not found.' });
    }

    const slot = availability.slots.id(slotId);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found.' });
    }
    if (slot.isBooked) {
      return res.status(409).json({ message: 'Cannot edit a slot that is already booked.' });
    }

    if (req.body.startTime) slot.startTime = new Date(req.body.startTime);
    if (req.body.endTime) slot.endTime = new Date(req.body.endTime);

    await availability.save();
    return res.status(200).json({ availability });
  } catch (err) {
    return res.status(500).json({ message: 'Could not update slot.', error: err.message });
  }
};

// DELETE /api/lawyers/me/availability/:availabilityId/slots/:slotId
exports.deleteSlot = async (req, res) => {
  try {
    const { availabilityId, slotId } = req.params;
    const lawyerId = req.user.userId;

    const availability = await Availability.findOne({ _id: availabilityId, lawyerId });
    if (!availability) {
      return res.status(404).json({ message: 'Availability not found.' });
    }

    const slot = availability.slots.id(slotId);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found.' });
    }
    if (slot.isBooked) {
      return res.status(409).json({ message: 'Cannot delete a slot that is already booked.' });
    }

    slot.deleteOne();
    await availability.save();

    return res.status(200).json({ message: 'Slot deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Could not delete slot.', error: err.message });
  }
};