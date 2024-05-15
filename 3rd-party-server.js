const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Mock database to store job and product information
const jobs = {};
const jobStatusQueries = {};
const warehouses = {
  A: {},
  B: {},
};

const timeWindows = {};

// Endpoint 1: POST carrier/request-job
app.post('/carrier/request-job', (req, res) => {
  console.log('/carrier/request-job', req.body);
  const { clientId, productId, quantity, origin, destination, collectionTime } =
    req.body;

  // Check if origin and destination are valid
  if (!['A', 'B'].includes(origin) || !['A', 'B'].includes(destination)) {
    res
      .status(400)
      .json({ status: 'ERROR', error: 'Invalid origin or destination' });
    console.log(`Invalid origin "${origin}" or destination "${destination}"`);
    return;
  }
  if (origin === destination) {
    res
      .status(400)
      .json({
        status: 'ERROR',
        error: 'Origin and destination cannot be the same',
      });
    console.log(`Origin and destination cannot be the same`);
    return;
  }

  const timeWindowKey = `${productId}-${quantity}-${origin}-${destination}`;
  let timeWindow = timeWindows[timeWindowKey];
  if (!timeWindow) {
    timeWindow = generateTimeWindow();
    timeWindows[timeWindowKey] = timeWindow;
  }

  // Check if collection time is within the suitable time window
  const collectionDateTime = new Date(collectionTime);
  if (
    collectionDateTime < timeWindow.start ||
    collectionDateTime > timeWindow.end
  ) {
    res.json({ status: 'REJECT' });
    console.log(
      `Collection time "${formatDate(collectionDateTime)}" is not within the suitable time window`,
    );
    console.log(
      `Suitable time window is between ${formatDate(timeWindow.start)} and ${formatDate(timeWindow.end)}`,
    );
    return;
  }

  // Generate jobId
  const jobId = `job_${Math.random().toString(36).substring(2, 9)}`;

  // Store job
  jobs[jobId] = {
    clientId,
    productId,
    quantity,
    origin,
    destination,
    collectionTime,
  };

  res.json({ status: 'ACCEPT', jobId, collectionTime });
  console.log(`Job request accepted with jobId: ${jobId}`);
  console.log(
    'Current jobs:',
    Object.entries(jobs)
      .map(([jobId, job]) => `\n - ${jobId}: ${job.collectionTime}`)
      .join(''),
  );
});

// Endpoint 2: GET carrier/job/#job-id/status
app.get('/carrier/job/:jobId/status', (req, res) => {
  const { jobId } = req.params;
  const job = jobs[jobId];
  if (!job) {
    res.json({ status: 'NOT FOUND' });
    console.log(`Job with jobId "${jobId}" not found`);
    return;
  }

  const jobQuery = jobStatusQueries[jobId];
  const currentTime = new Date();

  if (!jobQuery) {
    // Generate random time between 3 and 10 seconds from now
    const generatedTime = new Date(
      currentTime.getTime() +
        Math.floor(Math.random() * (6 - 3 + 1) + 3) * 1000,
    );
    jobStatusQueries[jobId] = { timestamp: generatedTime, status: null };
    res.json({ status: 'PENDING' });
    console.log(
      `Processing Job "${jobId}" for the first time. Job status is PENDING.`,
    );
    return;
  }

  if (jobQuery.status !== null) {
    res.json({ status: jobQuery.status });
    console.log(
      `Job "${jobId}" status is ${jobQuery.status}, this status will not change.`,
    );
    return;
  }

  if (jobQuery.timestamp > currentTime) {
    res.json({ status: 'PENDING' });
    console.log(`Job "${jobId}" status is PENDING.`);
    return;
  }

  // Check warehouses for release message based on origin property of the job detail
  const { origin, productId, destination } = job;
  const releaseMessage = warehouses[origin][productId];
  if (releaseMessage) {
    const { quantity, collectionTime } = releaseMessage;
    if (quantity === job.quantity && collectionTime === job.collectionTime) {
      jobQuery.status = 'RELEASED';
      res.json({ status: 'RELEASED' });

      const landingTime = new Date(
        currentTime.getTime() +
          Math.floor(Math.random() * (6 - 3 + 1) + 3) * 1000,
      );
      warehouses[destination][productId] = { landingTime, quantity };
      console.log(`Job "${jobId}" status is RELEASED.`);

      const filename = `expected-collection-confirmation-${jobId}.json`;
      fs.writeFileSync(
        filename,
        JSON.stringify(
          {
            productId,
            quantity,
            collectionTime,
          },
          null,
          2,
        ),
      );
      console.log(`Expected collection confirmation saved to ${filename}`);
      return;
    } else {
      console.log(
        'Collection failed, quantity or collectionTime does not match, expected:',
        quantity,
        collectionTime,
        'got:',
        job.quantity,
        job.collectionTime,
      );
    }
  }

  jobQuery.status = 'COLLECTION FAILED';
  res.json({ status: 'COLLECTION FAILED' });
  console.log(`Job "${jobId}" status is COLLECTION FAILED.`);
});

// Endpoint 3: POST warehouse/#warehouse-id/release
app.post('/warehouse/:warehouseId/release', (req, res) => {
  console.log('/warehouse/:warehouseId/release', req.body);
  const { warehouseId } = req.params;
  if (!['A', 'B'].includes(warehouseId)) {
    res.status(400).json({ status: 'ERROR', error: 'Invalid warehouse ID' });
    console.log(`Invalid warehouse ID "${warehouseId}"`);
    return;
  }

  const { productId, quantity, collectionTime } = req.body;

  // Assume warehouseId is provided in the URL, so we don't need to validate it here

  warehouses[warehouseId][productId] = { quantity, collectionTime };
  res.json({ status: 'SUCCESS' });
  console.log(
    `Product "${productId}" released from warehouse "${warehouseId}"`,
  );
});

// Endpoint 4: GET warehouse/#warehouse-id/product/#product-id/status
app.get('/warehouse/:warehouseId/product/:productId/status', (req, res) => {
  const { warehouseId, productId } = req.params;

  if (!['A', 'B'].includes(warehouseId)) {
    res.status(400).json({ status: 'ERROR', error: 'Invalid warehouse ID' });
    console.log(`Invalid warehouse ID "${warehouseId}"`);
    return;
  }

  const landingEntry = warehouses[warehouseId][productId];

  if (!landingEntry) {
    res.json({ status: 'NOT FOUND' });
    console.log(
      `Product "${productId}" not found at warehouse "${warehouseId}"`,
    );
    return;
  }

  const { landingTime, quantity } = landingEntry;
  const landed = new Date(landingTime) < new Date();
  if (landed) {
    res.json({ status: 'LANDED' });
    console.log(
      `Product "${productId}" at warehouse "${warehouseId}" has LANDED`,
    );

    const filename = `expected-landing-confirmation-${warehouseId}-${productId}.json`;
    fs.writeFileSync(
      filename,
      JSON.stringify(
        {
          quantity,
        },
        null,
        2,
      ),
    );
    console.log(`Expected landing confirmation saved to ${filename}`);
  } else {
    res.json({ status: 'NOT LANDED' });
    console.log(
      `Product "${productId}" at warehouse "${warehouseId}" has NOT LANDED`,
    );
  }
});

const port = process.argv[2] || 4001;
app.listen(port, () => {
  console.log(`3rd Party Server is running on port ${port}`);
});

function generateTimeWindow() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1); // Next calendar day

  const startWindow = new Date(tomorrow);
  startWindow.setHours(9 + Math.floor(Math.random() * 8)); // Random hour between 9am and 4pm

  const endWindow = new Date(tomorrow);
  endWindow.setHours(
    startWindow.getHours() +
      1 +
      Math.floor(Math.random() * (17 - startWindow.getHours())),
  ); // Random hour between start hour + 1 and 5pm

  return { start: startWindow, end: endWindow };
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is zero-based
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}
