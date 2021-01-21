let { join } = require('path');
let { existsSync, mkdirSync } = require('fs');
let { access, mkdir, writeFile } = require('fs').promises;
let express = require('express');
let fileUpload = require('express-fileupload');

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(__dirname, 'uploads');

let app = express();
let port = process.env.PORT || 3001;

app.use(express.urlencoded({ extended: true }));

// Implements retrieving files via GET
app.use(express.static(UPLOAD_DIR));

app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}));

if (!existsSync(UPLOAD_DIR)) {
  // Ensure that the upload directory exists
  mkdirSync(UPLOAD_DIR);
}

app.post('/image', async (req, res) => {
  if (!req.body.name && req.files.image) {
    res.status(400).send('Invalid request data.');
    return;
  }

  let name = req.body.name;
  let fileName = req.files.image.name;

  let nameDir = join(UPLOAD_DIR, name);

  try {
    await access(nameDir);
  } catch (e) {
    // The directory doesn't exist; create it
    await mkdir(nameDir);
  }

  try {
    await writeFile(join(nameDir, fileName), req.files.image.data);
  } catch(e) {
    res.status(500).send('Saving the uploaded file failed.');
    return;
  }
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Listening on port ${port}.`);
});
