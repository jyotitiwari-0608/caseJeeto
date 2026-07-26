function searchableLawyerFilter(lawyerId) {
  return {
    _id: lawyerId,
    verificationStatus: 'approved',
    isProfileVisible: true,
  };
}

module.exports = { searchableLawyerFilter };
