const fs = require('fs/promises');
const StateMachine = require('javascript-state-machine');
const { FSM_State } = require('./constants');

const stringify = (obj) => JSON.stringify(obj, null, 2);

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const JobStateMachine = new StateMachine.factory({
  init: FSM_State.ACCEPT,
  transitions: [
    {
      name: 'acceptToProductReleased',
      from: FSM_State.ACCEPT,
      to: FSM_State.PRODUCT_RELEASED,
    },
    {
      name: 'pollingJobStatus',
      from: [FSM_State.PRODUCT_RELEASED, FSM_State.JOB_PENDING],
      to: FSM_State.JOB_PENDING,
    },
    {
      name: 'jobPendingToJobReleased',
      from: FSM_State.JOB_PENDING,
      to: FSM_State.JOB_RELEASED,
    },
    {
      name: 'pollingJobReleasedToPollingLanded',
      from: [FSM_State.JOB_RELEASED, FSM_State.LANDED_POLLING],
      to: FSM_State.LANDED_POLLING,
    },
    {
      name: 'toEnd',
      from: FSM_State.LANDED_POLLING,
      to: FSM_State.END,
    },
  ],
});

function jobStateMachineFactory() {
  return new JobStateMachine();
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
  jobStateMachineFactory,
  writeCollectionConfirmationFile,
  writeLandingConfirmationFile,
};
