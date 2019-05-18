const express = require('express');
const app = express();
const path = require('path');
const hbs = require('./handler');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./model/User');
const Exercise = require('./model/Exercise');
const session = require('express-session');

// hbs config
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');

// Basic Config
require('dotenv').config({ path: 'process.env' }); // dotenv is not part of express, needs to install explicitly
const port = process.env.PORT || 3000;
const env = process.env.NODE_ENV || 'production';
if (env === 'development') {
  process.env.MONGODB_URI = process.env.MONGODB_LOCAL;
} else if (env === 'production') {
  process.env.MONGODB_URI = `mongodb+srv://afsal:${
    process.env.PASSWORD
  }@exercise-tracker-vg6j4.mongodb.net/test?retryWrites=true`;
}

// Connecting to MONGODB
mongoose.Promise = global.Promise;
mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true }, () =>
    console.log('connected on mongodb server')
  )
  .catch(err => console.log(err));

// User CORS
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Express Sessions
app.use(
  session({
    secret: 'secretKey',
    saveUninitialized: false,
    resave: false
  })
);

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.render('form', {
    title: 'Home Page'
  });
});

app.get('/exercise-tracker', (req, res) => {
  let config = {
    className: 'info',
    token: 'N/A',
    msg: `Please Log in first`
  };
  if (req.session.query) {
    config = req.session.query;
    req.session.query = null;
  }
  res.render('exercise', { config });
});

app.get('/log', async (req, res) => {
  if (req.session.token) {
    const token = req.session.token;
    req.session.token = null;
    try {
      const exercises = await Exercise.find({ token });
      const user = await User.findOne({ _id: token });
      if (exercises && user) {
        return res.render('log', {
          exercises,
          email: user.email
        });
      }
    } catch {
      return res.render('log', {
        className: 'danger',
        msg: 'Invalid token'
      });
    }
  }
  res.render('log', {
    className: 'info',
    msg: 'You need to login first'
  });
});

app.get('/api/log?', async (req, res) => {
  req.session.token = req.query.id;
  res.redirect('/log');
});

app.post('/api/exercise/get-token', (req, res) => {
  const email = req.body.email;
  User.findOne({ email }).then(user => {
    // if no such user exists
    if (!user) {
      const newUser = new User({ email });
      newUser.save();
      req.session.query = {
        className: 'success',
        token: newUser._id.toString(),
        msg: `Thank you for registering. Use your token for completing exercise tracker.`
      };

      res.redirect('/exercise-tracker');
    }

    // if user exists
    else {
      req.session.query = {
        className: 'warning',
        token: user._id.toString(),
        msg: `Your email has already been registered. Please use your token for tracking your exercise.`
      };
      res.redirect('/exercise-tracker');
    }
  });
});

app.post('/api/exercise/add', async (req, res) => {
  let { token, desc, time, date } = req.body;
  if (!token || !desc || !time) {
    req.session.query = {
      className: 'info',
      token: token || 'N/A',
      msg: `Please fill in all the details`
    };
    return res.redirect('/exercise-tracker');
  }
  User.findOne({ _id: token }).then(user => {
    if (user) {
      const data = {
        token: user._id,
        description: desc,
        duration: time
      };
      const newExercise = new Exercise(data);
      newExercise.save();
      console.log('newExercise', newExercise);
      req.session.token = user._id;
      res.redirect('/log');
    }
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res.sendFile(path.join(__dirname + '/public/404.html'));
});

app.listen(port, () => {
  console.log(`Your app is listening on port ${port}`);
});
