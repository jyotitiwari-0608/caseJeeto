const Lawyer = require('../models/lawyer');

function idString(value) {
  if (!value) return '';
  return String(value._id || value);
}

async function enrichBookingsWithLawyerProfiles(bookings) {
  const list = Array.isArray(bookings) ? bookings : [bookings];
  const lawyerUserIds = [...new Set(list.map((booking) => idString(booking.lawyerId)).filter(Boolean))];

  const profiles = await Lawyer.find({ userId: { $in: lawyerUserIds } })
    .select('userId specialization consultationFee yearsOfExperience courtsPracticed languages')
    .populate('userId', 'name email')
    .lean();

  const profileByUserId = new Map(profiles.map((profile) => [idString(profile.userId), profile]));
  const enriched = list.map((booking) => {
    const raw = typeof booking.toObject === 'function' ? booking.toObject() : booking;
    const lawyerUserId = idString(raw.lawyerId);
    const profile = profileByUserId.get(lawyerUserId);

    return {
      ...raw,
      lawyerId: {
        _id: raw.lawyerId?._id || raw.lawyerId,
        name: profile?.userId?.name || raw.lawyerId?.name,
        email: profile?.userId?.email || raw.lawyerId?.email,
        profileId: profile?._id || null,
        specialization: profile?.specialization || [],
        consultationFee: profile?.consultationFee || 0,
        yearsOfExperience: profile?.yearsOfExperience || 0,
        courtsPracticed: profile?.courtsPracticed || [],
        languages: profile?.languages || [],
      },
    };
  });

  return Array.isArray(bookings) ? enriched : enriched[0];
}

module.exports = { enrichBookingsWithLawyerProfiles };
