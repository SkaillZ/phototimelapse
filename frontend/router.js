let express = require('express');
let router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index');
});

router.post('/upload', (req, res) => {
  console.log(req.body);
  console.dir(req.files);
  res.status(200).send('OK');
});

module.exports = router;
