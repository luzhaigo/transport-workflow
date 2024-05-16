const RequestStatus = {
  ACCEPT: 'ACCEPT',
  REJECT: 'REJECT',
  ERROR: 'ERROR',
};

const JobStatus = {
  NOT_FOUND: 'NOT FOUND',
  PENDING: 'PENDING',
  RELEASED: 'RELEASED',
  COLLECTION_FAILED: 'COLLECTION FAILED',
};

const ReleaseProductStatus = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
};

const WarehouseProductStatus = {
  ERROR: 'ERROR',
  NOT_FOUND: 'NOT FOUND',
  LANDED: 'LANDED',
  NOT_LANDED: 'NOT LANDED',
};

const FSM_State = {
  ACCEPT: 'ACCEPT',
  PRODUCT_RELEASED: 'PRODUCT_RELEASED',
  JOB_PENDING: 'JOB_PENDING',
  JOB_RELEASED: 'JOB_RELEASED',
};

module.exports = {
  RequestStatus,
  JobStatus,
  ReleaseProductStatus,
  WarehouseProductStatus,
  FSM_State,
};
