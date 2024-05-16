const axios = require('axios');

const api = axios.create({ baseURL: 'http://localhost:4001' });

module.exports = {
  async createJob(job) {
    return api.post('/carrier/request-job', job).then((res) => res.data);
  },

  async queryJobStatus(jobId) {
    return api.get(`/carrier/job/${jobId}/status`).then((res) => res.data);
  },

  async releaseProduct({ warehouseId, productId, quantity, collectionTime }) {
    return api
      .post(`/warehouse/${warehouseId}/release`, {
        productId,
        quantity,
        collectionTime,
      })
      .then((res) => res.data);
  },

  async queryWarehouseProductStatus({ warehouseId, productId }) {
    return api
      .get(`/warehouse/${warehouseId}/product/${productId}/status`)
      .then((res) => res.data);
  },
};
