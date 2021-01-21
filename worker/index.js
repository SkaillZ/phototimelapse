let { createReadStream, createWriteStream } = require('fs');
let { mkdtemp, rm } = require('fs').promises;
let { tmpdir } = require('os');
let { sep, basename, join } = require('path');

let axios = require('axios');
let FormData = require('form-data');
let ampq = require('amqplib/callback_api');
let ffmpeg = require('fluent-ffmpeg');

const RABBIT_MQ_CONNECTION_RETRIES = 10;
const RABBIT_MQ_CONNECTION_RETRY_WAIT = 5;

const QUEUE = 'image-notify';
const MUSIC_TRACKS = ['cursed-music/tiny-woods.mp3'];

const RABBIT_MQ_SERVER = process.env.RABBIT_MQ_SERVER;
if (!RABBIT_MQ_SERVER) {
  throw new Error('RABBIT_MQ_SERVER variable not set!');
}

const FILE_API_URL = process.env.FILE_API_URL;
if (!FILE_API_URL) {
  throw new Error('FILE_API_URL variable not set!');
}

connect();

function connect(retries = 0) {
  console.log(`Connecting to RabbitMQ on ${RABBIT_MQ_SERVER}...`);

  // Connect to RabbitMQ
  ampq.connect(`amqp://${RABBIT_MQ_SERVER}`, (err0, connection) => {
    if (err0) {
      retryConnection(retries, err0);
      return;
    }

    connection.createChannel((err1, channel) => {
      if (err0) {
        retryConnection(retries, err1);
        return;
      }

      console.log('Connected to RabbitMQ. Waiting for messages...');

      channel.assertQueue(QUEUE, { durable: false });

      // Make sure that the messages only get consumed after the previous video conversion has
      // finished (the acknowledgement has been sent).
      channel.prefetch(1);

      channel.consume(QUEUE, async (msg) => {
        let { name } = JSON.parse(msg.content.toString());
        if (!name) {
          console.error('Invalid request from queue!');
          return;
        }

        console.log(`Received request to generate video with name '${name}'`);

        try {
          await generateVideo(name);

          console.log(`Video for '${name}' has been successfully generated.`);

          // Send acknowledgement once we've successfully updated the video
          channel.ack(msg);
        } catch (e) {
          console.error(e);
        }
      });
    });
  });
}

async function generateVideo(name) {
  const fileUrls = (await axios.get(`${FILE_API_URL}/${name}/index`)).data
    .files;

  // Download the images to a temp directory
  let tmpFolder = await mkdtemp(`${tmpdir()}${sep}`);
  let downloadedFiles = await Promise.all(
    fileUrls.map((file) => axios.get(file, { responseType: 'stream' }))
  );

  await Promise.all(
    downloadedFiles.map(
      (response) =>
        new Promise((resolve, reject) => {
          // Extract the file name from the request URL
          let fileName = basename(response.request.path);

          // Save to temp directory
          let writer = createWriteStream(join(tmpFolder, fileName));
          response.data.pipe(writer);

          writer.on('error', (err) => {
            writer.close();
            reject(err);
          });
          writer.on('close', () => {
            resolve();
          });
        })
    )
  );

  // Create video with ffmpeg
  let outputPath = `${tmpFolder}/video.mp4`;
  await new Promise((resolve, reject) => {
    // Randomly select a music track
    let musicTrackIndex = Math.floor(Math.random() * (MUSIC_TRACKS.length - 1));
    let musicTrack = MUSIC_TRACKS[musicTrackIndex];

    ffmpeg()
      .addInput(musicTrack)
      .addInput(`${tmpFolder}/%*.jpg`)
      .inputFPS(0.7)
      .outputFPS(25)
      .format('mp4')
      .size('?x720')
      .addOption('-shortest') // Trim the audio to the video length
      .on('error', reject)
      .on('end', resolve)
      .save(outputPath);
  });

  // Upload to the file API
  let form = new FormData();
  form.append('name', name);
  form.append('video', createReadStream(outputPath), {
    filename: basename(outputPath),
  });
  await axios.post(`${FILE_API_URL}/video`, form, {
    headers: form.getHeaders(),
  });

  // Clean up the temp folder
  await rm(tmpFolder, { recursive: true, force: true });
}

function retryConnection(retries, err) {
  // Retry connecting until RabbitMQ is up
  if (retries < RABBIT_MQ_CONNECTION_RETRIES) {
    console.error('Retrying due to error: ' + err.message);
    setTimeout(
      () => connect(retries + 1),
      RABBIT_MQ_CONNECTION_RETRY_WAIT * 1000
    );
  } else {
    throw err;
  }
}
