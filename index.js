const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const ObjectId = require("mongoose").Types.ObjectId;
const { Schema } = mongoose;
const bodyParser = require("body-parser");
require("dotenv").config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(
    process.env.DB_URI
  );
}

const userSchema = new Schema(
  {
    username: { type: String, require: true, unique: true },
    exercises: [
      {
        description: String,
        duration: Number,
        date: Date,
      },
    ],
  },
  { versionKey: false }
);

const User = mongoose.model("User", userSchema);
const ERROR = { error: "There was an error while getting the users." };

app.get("/api/users", (req, res) => {
  User.find({})
    .then((data) => res.json(data))
    .catch((err) => res.send(ERROR));
});

app.get("/api/users/:id/logs", (req, res) => {
  const id = req.params.id;
  const dateFrom = req.query.from ? new Date(req.query.from) : null;
  const dateTo = req.query.to ? new Date(req.query.to) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;

  User.findOne({ _id: new ObjectId(id) })
    .then((data) => {
      if (!data) return res.send(ERROR);

      let log = data.exercises;

      // Apply from / to filters only if provided
      if (dateFrom) {
        log = log.filter(
          (exercise) => new Date(exercise.date).getTime() >= dateFrom.getTime()
        );
      }
      if (dateTo) {
        log = log.filter(
          (exercise) => new Date(exercise.date).getTime() <= dateTo.getTime()
        );
      }

      // Map formatted log
      log = log.map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString(),
      }));

      // Apply limit if provided
      if (limit) log = log.slice(0, limit);

      res.json({
        _id: data._id,
        username: data.username,
        count: log.length, // count of filtered exercises
        log,
      });
    })
    .catch((err) => {
      console.error(err);
      res.send(ERROR);
    });
});

app.post("/api/users", (req, res) => {
  const username = req.body.username;
  User.create({ username: username })
    .then((user) => res.json({ _id: user._id, username: user.username }))
    .catch((err) => res.json(ERROR));
});

app.post("/api/users/:id/exercises", (req, res) => {
  const id = req.params.id;
  let { description, duration, date } = req.body;

  const newExercise = {
    description: description,
    duration: duration,
    date: date ? new Date(date).toDateString() : new Date().toDateString(),
  };

  User.findOne({ _id: new ObjectId(id) })
    .then((data) => {
      if (!data) return res.send(ERROR);

      data.exercises.push(newExercise);

      return data.save();
    })
    .then((data) => {
      const lastExercise = data.exercises[data.exercises.length - 1];

      const response = {
        username: data.username,
        description: lastExercise.description,
        duration: lastExercise.duration,
        date: new Date(lastExercise.date).toDateString(),
        _id: data._id,
      };

      res.json(response);
    })
    .catch((err) => {
      console.error(err);
      res.send(ERROR);
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
