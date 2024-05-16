const fs = require('fs/promises');
const StateMachine = require('javascript-state-machine');
const { FSM_State } = require('./constants');

const stringify = (obj) => JSON.stringify(obj, null, 2);

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function stateMachineFactory() {
  return new StateMachine({
    init: FSM_State.ACCEPT,
    transitions: [
      {
        name: 'acceptToProductReleased',
        from: FSM_State.ACCEPT,
        to: FSM_State.PRODUCT_RELEASED,
      },
      {
        name: 'productReleasedToJobPending',
        from: FSM_State.PRODUCT_RELEASED,
        to: FSM_State.JOB_PENDING,
      },
      {
        name: 'jobPendingToJobPending',
        from: FSM_State.JOB_PENDING,
        to: FSM_State.JOB_PENDING,
      },
      {
        name: 'jobPendingToJobReleased',
        from: FSM_State.JOB_PENDING,
        to: FSM_State.JOB_RELEASED,
      },
    ],
  });
}

async function writeCollectionConfirmationFile({
  jobId,
  productId,
  quantity,
  collectionTime,
}) {
  const filename = `collection-confirmation-${jobId}.json`;
  await fs.writeFile(
    filename,
    stringify({
      productId,
      quantity,
      collectionTime,
    }),
  );
  console.log(`Expected collection confirmation saved to ${filename}`);
}

async function writeLandingConfirmationFile({
  warehouseId,
  productId,
  quantity,
}) {
  const filename = `landing-confirmation-${warehouseId}-${productId}.json`;
  await fs.writeFile(filename, stringify({ quantity }));

  console.log(`landing confirmation saved to ${filename}`);
}

module.exports = {
  stringify,
  delay,
  stateMachineFactory,
  writeCollectionConfirmationFile,
  writeLandingConfirmationFile,
};
