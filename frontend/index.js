let createError = require('http-errors');
let express = require('express');
let path = require('path');
let http = require('http');
let logger = require('morgan');
let fileUpload = require('express-fileupload');
let ampq = require('amqplib/callback_api');

let router = require('./router');

const port = process.env.PORT || 3000;
const RABBIT_MQ_SERVER = process.env.RABBIT_MQ_SERVER;
if (!RABBIT_MQ_SERVER) {
  throw new Error('RABBIT_MQ_SERVER variable not set!');
}

let app = express();
let rabbitMQChannel; // The RabbitMQ channel to send messages with

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}));

// Custom middleware for adding the RabbitMQ channel
app.use((req, res, next) => {
  req.channel = rabbitMQChannel;
  next();
});

app.use('/', router);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Connect to RabbitMQ
console.log(`Connecting to RabbitMQ on ${RABBIT_MQ_SERVER}...`);
ampq.connect(`amqp://${RABBIT_MQ_SERVER}`, (err0, connection) => {
  if (err0) {
    throw err0;
  }

  connection.createChannel((err1, channel) => {
    if (err1) {
      throw err1;
    }

    console.log('Connected to RabbitMQ.');
    rabbitMQChannel = channel;

    let server = http.createServer(app);
    server.listen(port, () => {
      console.log(`Listening on port ${port}.`);
    });

  });
})

