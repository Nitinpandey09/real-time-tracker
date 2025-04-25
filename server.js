const express = require("express");
const session = require("express-session");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");

const sequelize = require("./sequelize");
const User = require("./models/User");
const Location = require("./models/Location");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// ✅ Use dynamic port for Render
const PORT = process.env.PORT || 3000;

// ✅ Initialize DB
(async () => {
  await sequelize.sync();
  console.log("SQLite connected");
})();

// ✅ View engine and middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // optional, but clean
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// ✅ Session support
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
  })
);

// ✅ Routes
app.get("/", (req, res) => {
  if (!req.session.username) return res.redirect("/login");
  res.render("index", {
    username: req.session.username,
    isAdmin: req.session.isAdmin,
    avatar: req.session.avatar,
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { username, avatar, password } = req.body;
  req.session.username = username;
  req.session.avatar = avatar || null;
  req.session.isAdmin = password === "admin123";
  res.redirect("/");
});

// ✅ In-memory user tracking
const users = {};

io.on("connection", (socket) => {
  socket.on("join", async (data) => {
    users[socket.id] = { ...data, id: socket.id };
    socket.broadcast.emit("toast", `${data.username} joined`);
    io.emit("users", Object.values(users));
    console.log(`[JOIN] ${data.username} connected (${socket.id})`);
  });

  socket.on("send-location", async (data) => {
    const user = users[socket.id];
    if (!user) return;

    await Location.create({
      userId: socket.id,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date(),
    });

    console.log(`[LOCATION] ${user.username}:`, data);

    for (const id of Object.keys(users)) {
      io.to(id).emit("receive-location", {
        id: socket.id,
        username: user.username,
        avatar: user.avatar,
        latitude: data.latitude,
        longitude: data.longitude,
      });
    }
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      console.log(`[DISCONNECT] ${user.username} (${socket.id})`);
      io.emit("toast", `${user.username} left`);
      io.emit("user-disconnected", socket.id);
      delete users[socket.id];
      io.emit("users", Object.values(users));
    }
  });
});

// ✅ Start server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
