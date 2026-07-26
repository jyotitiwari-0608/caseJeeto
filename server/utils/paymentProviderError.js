function providerStatus(error) {
  return Number(error?.statusCode || error?.status || error?.response?.status || 0);
}

function isDeterministicProviderRejection(error) {
  const status = providerStatus(error);
  return status >= 400 && status < 500 && ![408, 409, 425, 429].includes(status);
}

module.exports = { isDeterministicProviderRejection };
