const PAYMENT_METHODS = Object.freeze({
  COD: 'cod',
  VNPAY: 'vnpay'
});

const ORDER_STATUSES = Object.freeze({
  COD_PENDING: 'pending',
  COD_PAID: 'paid',
  VNPAY_PENDING: 'pending_vnpay',
  VNPAY_PAID: 'paid_vnpay',
  VNPAY_FAILED: 'failed_vnpay',
  VNPAY_CANCELLED: 'cancelled_vnpay',
  VNPAY_EXPIRED: 'expired_vnpay'
});

const paymentLabels = Object.freeze({
  [PAYMENT_METHODS.COD]: 'Cash on delivery',
  [PAYMENT_METHODS.VNPAY]: 'VNPay QR'
});

function normalizePaymentMethod(value) {
  return String(value || '').trim().toLowerCase() === PAYMENT_METHODS.VNPAY
    ? PAYMENT_METHODS.VNPAY
    : PAYMENT_METHODS.COD;
}

function getInitialOrderStatus(paymentMethod) {
  return normalizePaymentMethod(paymentMethod) === PAYMENT_METHODS.VNPAY
    ? ORDER_STATUSES.VNPAY_PENDING
    : ORDER_STATUSES.COD_PENDING;
}

function getPaymentMethodFromStatus(status) {
  return String(status || '').toLowerCase().includes('vnpay')
    ? PAYMENT_METHODS.VNPAY
    : PAYMENT_METHODS.COD;
}

function isOrderPaid(status) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  return normalizedStatus === ORDER_STATUSES.COD_PAID || normalizedStatus === ORDER_STATUSES.VNPAY_PAID;
}

function isFinalOrderStatus(status) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  return [
    ORDER_STATUSES.COD_PAID,
    ORDER_STATUSES.VNPAY_PAID,
    ORDER_STATUSES.VNPAY_FAILED,
    ORDER_STATUSES.VNPAY_CANCELLED,
    ORDER_STATUSES.VNPAY_EXPIRED
  ].includes(normalizedStatus);
}

function canCreateVnpayPayment(status) {
  return String(status || '').trim().toLowerCase() === ORDER_STATUSES.VNPAY_PENDING;
}

function getStatusLabel(status) {
  switch (String(status || '').trim().toLowerCase()) {
    case ORDER_STATUSES.COD_PENDING:
      return 'Pending confirmation';
    case ORDER_STATUSES.COD_PAID:
      return 'Paid';
    case ORDER_STATUSES.VNPAY_PENDING:
      return 'Awaiting VNPay payment';
    case ORDER_STATUSES.VNPAY_PAID:
      return 'Paid via VNPay';
    case ORDER_STATUSES.VNPAY_FAILED:
      return 'VNPay payment failed';
    case ORDER_STATUSES.VNPAY_CANCELLED:
      return 'VNPay payment cancelled';
    case ORDER_STATUSES.VNPAY_EXPIRED:
      return 'VNPay payment expired';
    default:
      return 'Pending';
  }
}

function getVnpayStatusFromResponse(responseCode, transactionStatus) {
  const normalizedResponse = String(responseCode || '').trim();
  const normalizedTransactionStatus = String(transactionStatus || '').trim();
  const isSuccess =
    normalizedResponse === '00' &&
    (!normalizedTransactionStatus || normalizedTransactionStatus === '00');

  if (isSuccess) {
    return ORDER_STATUSES.VNPAY_PAID;
  }

  if (normalizedResponse === '24') {
    return ORDER_STATUSES.VNPAY_CANCELLED;
  }

  if (normalizedResponse === '11') {
    return ORDER_STATUSES.VNPAY_EXPIRED;
  }

  return ORDER_STATUSES.VNPAY_FAILED;
}

module.exports = {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  canCreateVnpayPayment,
  getInitialOrderStatus,
  getPaymentMethodFromStatus,
  getStatusLabel,
  getVnpayStatusFromResponse,
  isFinalOrderStatus,
  isOrderPaid,
  normalizePaymentMethod,
  paymentLabels
};
