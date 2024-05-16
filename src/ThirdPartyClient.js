const { Logger } = require('@open-draft/logger');
const {
  RequestStatus,
  JobStatus,
  ReleaseProductStatus,
  WarehouseProductStatus,
  FSM_State,
} = require('./constants');
const {
  stringify,
  delay,
  jobStateMachineFactory,
  writeCollectionConfirmationFile,
  writeLandingConfirmationFile,
} = require('./utils');

const logger = new Logger('ThirdPartyClient');

class ThirdPartyClient {
  constructor({ pollInterval = 1000, concurrency = 5, api } = {}) {
    this.isStart = false;
    this.pollInterval = pollInterval;
    this.currentConcurrency = 0;
    this.concurrency = concurrency;
    this.pendingJobs = [];
    this.api = api;
  }

  // handle business logic
  async requestJob(job) {
    const { status, error, jobId, ...rest } = await this.api.createJob(job);
    logger.info(
      `response of rquestJob: ${stringify({ status, error, jobId, ...rest })}`,
    );

    if (status === RequestStatus.ERROR) {
      throw new Error(error);
    }

    if (status === RequestStatus.ACCEPT) {
      this.pendingJobs.push({
        ...job,
        jobId,
      });
    }

    return {
      ...rest,
      status,
      jobId,
    };
  }

  startTasks() {
    logger.info('start executing tasks');
    this.isStart = true;

    this.executeWorkflows();
  }

  stopTasks() {
    if (!this.isStart) return;

    logger.info('stop executing tasks');
    this.isStart = false;
  }

  async executeWorkflow(job) {
    this.currentConcurrency++;

    logger.info(`executing jobId: ${job.jobId}`);

    const jsm = jobStateMachineFactory();
    let running = true;
    // eslint-disable-next-line no-constant-condition
    while (running) {
      const {
        jobId,
        productId,
        origin,
        destination,
        quantity,
        collectionTime,
      } = job;

      try {
        switch (jsm.state) {
          case FSM_State.ACCEPT: {
            logger.info(`release product: ${productId}`);
            const releaseProductData = await this.api.releaseProduct({
              productId,
              warehouseId: origin,
              quantity,
              collectionTime: job.collectionTime,
            });
            logger.info(
              `release product data: ${stringify(releaseProductData)}`,
            );
            if (releaseProductData.status === ReleaseProductStatus.ERROR) {
              running = false;
              break;
            }
            jsm.acceptToProductReleased();
            break;
          }
          case FSM_State.PRODUCT_RELEASED:
          case FSM_State.JOB_PENDING: {
            const jobStatusData = await this.api.queryJobStatus(jobId);
            logger.info(`query job status: ${stringify(jobStatusData)}`);
            if (
              jobStatusData.status !== JobStatus.PENDING &&
              jobStatusData.status !== JobStatus.RELEASED
            ) {
              running = false;
              break;
            }
            if (jobStatusData.status === JobStatus.RELEASED)
              jsm.jobPendingToJobReleased();
            else jsm.pollingJobStatus();
            break;
          }
          case FSM_State.JOB_RELEASED: {
            await writeCollectionConfirmationFile({
              jobId,
              collectionTime,
              productId,
              quantity,
            });
            jsm.pollingJobReleasedToPollingLanded();
            break;
          }
          case FSM_State.LANDED_POLLING: {
            logger.info(
              `query warehouse ${destination} product ${productId} status`,
            );
            const warehouseProductStatus =
              await this.api.queryWarehouseProductStatus({
                warehouseId: destination,
                productId,
              });
            if (
              warehouseProductStatus.status !==
                WarehouseProductStatus.NOT_LANDED &&
              warehouseProductStatus.status !== WarehouseProductStatus.LANDED
            ) {
              running = false;
              break;
            }

            if (
              warehouseProductStatus.status === WarehouseProductStatus.LANDED
            ) {
              await writeLandingConfirmationFile({
                warehouseId: destination,
                productId,
                quantity,
              });
              {
                jsm.toEnd();
                running = false;
                break;
              }
            }
            break;
          }
          default: {
            running === false;
            break;
          }
        }

        if (running === false) break;

        await delay(this.pollInterval);
      } catch (error) {
        logger.error(error);
      }
    }

    this.currentConcurrency--;
  }

  async executeWorkflows() {
    logger.info('start executing workflows');

    while (this.isStart && this.pendingJobs.length) {
      const jobs = this.pendingJobs.splice(
        0,
        this.concurrency - this.currentConcurrency,
      );
      if (!jobs.length) break;

      logger.info(`the length of concurrent job: ${jobs.length}`);
      await Promise.allSettled(jobs.map((job) => this.executeWorkflow(job)));
    }

    if (!this.pendingJobs.length) this.isStart = false;
  }
}

module.exports = { ThirdPartyClient };
