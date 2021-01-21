let express = require('express');
let axios = require('axios');
let FormData = require('form-data');

let router = express.Router();

const FILE_API_URL = process.env.FILE_API_URL;
if (!FILE_API_URL) {
  throw new Error('FILE_API_URL variable not set!');
}

// GET the home page
router.get('/', (req, res) => {
  res.render('index', { fileApiUrl: FILE_API_URL });
});

// File upload
router.post('/upload', async (req, res) => {
  if (!req.body.name && req.files.image) {
    res.status(400).send('Invalid request data.');
    return;
  }

  // Name the file after the current ISO date since it allows lexographical sorting
  let timestamp = new Date().toISOString();
  let filename = `${timestamp}.jpg`;

  let form = new FormData();
  form.append('name', req.body.name);
  form.append('image', req.files.image.data, { filename });
  
  try {
    axios.post(`${FILE_API_URL}/image`, form, { headers: form.getHeaders() });
  } catch (e) {
    res.status(500).send('File upload to API failed.');
    return;
  }
  res.status(200).send('OK');
});

module.exports = router;
