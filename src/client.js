const { ThirdPartyClient } = require('./ThirdPartyClient');
const API = require('./api');

const client = new ThirdPartyClient({ api: API });

module.exports = client;
