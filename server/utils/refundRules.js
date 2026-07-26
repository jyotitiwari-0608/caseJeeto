const AppError = require('./AppError');

function applyRefundIncrement({ amount, currentRefunded = 0, consultationFee, requestedRefund }) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new AppError('Refund amount must be a positive integer in paise.', 400);
  }
  const remainingPayment = consultationFee - currentRefunded;
  const remainingRequest = requestedRefund - currentRefunded;
  if (amount > remainingPayment || amount > remainingRequest) {
    throw new AppError('Refund amount exceeds the remaining refundable balance.', 400);
  }
  const cumulativeRefund = currentRefunded + amount;
  return {
    cumulativeRefund,
    paymentCompleted: cumulativeRefund >= consultationFee,
    requestCompleted: cumulativeRefund >= requestedRefund,
  };
}

module.exports = { applyRefundIncrement };
