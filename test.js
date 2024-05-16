const axios = require('axios');

const api = axios.create({ baseURL: 'http://localhost:8080' });

const rand = () => Math.random().toString(36).substring(2, 9);

const createJob = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1); // Next calendar day

  const startWindow = new Date(tomorrow);
  startWindow.setHours(9 + Math.floor(Math.random() * 8) + 2);

  return {
    clientId: rand(),
    productId: rand(),
    quantity: 1,
    collectionTime: startWindow,
    origin: 'A',
    destination: 'B',
  };
};

async function requestJob() {
  const job = createJob();
  return api.post('/request-transport', job).then((res) => res.data);
}

async function start(count) {
  try {
    const data = await Promise.allSettled(
      [...new Array(count)].map(() => requestJob()),
    );
    console.log(
      'data',
      data.map((d) => d),
    );

    console.log(
      'count: ',
      data.filter((d) => d.value.data.status !== 'REJECT').length,
    );
  } catch (error) {
    console.log(error?.response?.data || error.message);
  }
}

start(20);
