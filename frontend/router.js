let express = require('express');
let axios = require('axios');
let FormData = require('form-data');

let router = express.Router();

const QUEUE = 'image-notify';

// Used in the internal docker network for the file upload between frontend server and API
const FILE_API_URL = process.env.FILE_API_URL;
if (!FILE_API_URL) {
  throw new Error('FILE_API_URL variable not set!');
}

// Used to embed the video in the browser
const FILE_API_URL_EXTERNAL = process.env.FILE_API_URL_EXTERNAL || FILE_API_URL;

// GET the home page
router.get('/', (req, res) => {
  res.render('index', { fileApiUrl: FILE_API_URL_EXTERNAL });
});

// File upload
router.post('/upload', async (req, res) => {
  if (!(req.body.name && req.files.image)) {
    res.status(400).send('Invalid request data.');
    return;
  }

  // Name the file after the current ISO date since it allows lexographical sorting
  let timestamp = new Date().toISOString();
  let filename = `${timestamp}.jpg`;

  let form = new FormData();
  form.append('name', req.body.name);
  form.append('image', req.files.image.data, { filename });
  
  // Upload the file to the file REST API
  try {
    await axios.post(`${FILE_API_URL}/image`, form, { headers: form.getHeaders() });

    // RabbitMQ message
    let message = { name: req.body.name };
    req.channel.assertQueue(QUEUE, { durable: false });
    if (!req.channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(message)))) {
      throw new Error('Couldn\'t send to queue.');
    }
  } catch (e) {
    res.status(500).send('An error occured while handling the uploaded image.');
    return;
  }

  res.status(200).send('OK');
});

module.exports = router;
