const { Logger } = require('@open-draft/logger');
const express = require('express');
const bodyParser = require('body-parser');
const { body } = require('express-validator');
const { validator } = require('./middlewares');
const client = require('./client');
const { stringify } = require('./utils');

const logger = new Logger('Ferovinum Server');

const app = express();
app.use(bodyParser.json());

app.post(
  '/request-transport',
  validator([
    body('clientId').isString(),
    body('productId').isString(),
    body('quantity').isNumeric(),
    ...['origin', 'destination'].map((field) =>
      body(field)
        .custom((v) => v === 'A' || v === 'B')
        .withMessage("Value must be 'A' or 'B'"),
    ),
    body('origin')
      .custom((v, { req }) => v !== req.body.destination)
      .withMessage('Origin is the same as Destination'),
    body('collectionTime').isISO8601(),
  ]),
  async (req, res) => {
    const body = req.body;
    logger.info(`request transport payload: ${stringify(body)}`);

    try {
      const data = await client.requestJob(body);
      res.status(202).json({
        data,
        message: null,
      });
    } catch (error) {
      logger.error(error);
      return res.json({ data: null, message: error.message });
    }

    client.startTasks();
  },
);

const port = process.argv[2] || 8080;
app.listen(port, () => {
  logger.info(`Ferovinum Server is running on port ${port}`);
});
