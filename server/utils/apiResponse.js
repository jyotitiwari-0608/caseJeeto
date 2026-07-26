exports.sendSuccess = (res, status, data, meta) => {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

exports.paginationMeta = ({ total, page, limit }) => {
  const totalPages = Math.ceil(total / Number(limit)) || 0;
  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages,
  };
};