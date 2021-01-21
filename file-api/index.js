let { join } = require('path');
let { existsSync, mkdirSync } = require('fs');
let { access, mkdir, readdir, writeFile } = require('fs').promises;
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

// Return a JSON with a file list if we request
// "[video directory name]/index"
app.get('*/index', async (req, res) => {
  // Cut off the "/index" at the end of the URL
  let suffixIndex = req.url.lastIndexOf('/index');
  let dirPath = req.url.substring(0, suffixIndex);

  try {
    let files = await readdir(join(UPLOAD_DIR, dirPath));
    let filesWithUrl = files
      .map(file => join(dirPath, file))
      .map(file => `${req.protocol}://${req.get('host')}${file}`);
    res.status(200).json({ files: filesWithUrl });
  } catch(e) {
    res.status(404).json({ files: [] });
  }
});

// POST an image
app.post('/image', async (req, res) => {
  if (!(req.body.name && req.files.image)) {
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

// POST a video
app.post('/video', async (req, res) => {
  if (!(req.body.name && req.files.video)) {
    res.status(400).send('Invalid request data.');
    return;
  }

  let name = req.body.name;
  let fileName = `${name}.mp4`;

  try {
    await writeFile(join(UPLOAD_DIR, fileName), req.files.video.data);
  } catch(e) {
    res.status(500).send('Saving the uploaded file failed.');
    return;
  }
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Listening on port ${port}.`);
});
