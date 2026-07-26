const Lawyer = require('../models/lawyer');

// Whitelist of fields a lawyer may edit on their own profile. Everything
// else on the Lawyer model (verificationStatus, rating, reviewCount,
// totalConsultations, razorpayAccountId) is system/admin-only and must
// never be settable from this controller.
const EDITABLE_FIELDS = [
  'specialization',
  'yearsOfExperience',
  'courtsPracticed',
  'languages',
  'consultationFee',
  'bio',
  'officeAddress',
  'profilePhoto',
];

// GET /api/lawyers/me
exports.getMyProfile = async (req, res) => {
  try {
    const lawyer = await Lawyer.findOne({ userId: req.user.userId }).populate(
      'userId',
      'name email phone'
    );
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer profile not found.' });
    }
    return res.status(200).json({ lawyer });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch profile.', error: err.message });
  }
};

// PATCH /api/lawyers/me
exports.updateMyProfile = async (req, res) => {
  try {
    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No editable fields provided.' });
    }
    if (updates.bio && updates.bio.length > 1500) {
      return res.status(400).json({ message: 'Bio must be 1500 characters or fewer.' });
    }
    if (updates.consultationFee !== undefined && updates.consultationFee < 0) {
      return res.status(400).json({ message: 'Consultation fee cannot be negative.' });
    }

    const lawyer = await Lawyer.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer profile not found.' });
    }
    return res.status(200).json({ lawyer });
  } catch (err) {
    return res.status(500).json({ message: 'Could not update profile.', error: err.message });
  }
};

// PATCH /api/lawyers/me/visibility
// A lawyer may only go visible once verification is fully approved, so an
// unverified/rejected lawyer can never appear in client search by simply
// flipping this toggle.
exports.toggleVisibility = async (req, res) => {
  try {
    const { isProfileVisible } = req.body;
    if (typeof isProfileVisible !== 'boolean') {
      return res.status(400).json({ message: 'isProfileVisible must be a boolean.' });
    }

    const lawyer = await Lawyer.findOne({ userId: req.user.userId });
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer profile not found.' });
    }

    if (isProfileVisible && lawyer.verificationStatus !== 'approved') {
      return res.status(403).json({
        message: 'Profile can only be made visible after verification is approved.',
      });
    }

    lawyer.isProfileVisible = isProfileVisible;
    await lawyer.save();

    return res.status(200).json({ lawyer });
  } catch (err) {
    return res.status(500).json({ message: 'Could not update visibility.', error: err.message });
  }
};
