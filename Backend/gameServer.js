const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const { User, Admin } = require("./database");

const app = express();

// Middleware Setup
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));

// Serve static files from Frontend directory
app.use(express.static(path.join(__dirname, "../Frontend")));

// Sign up route
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (role === "admin") {
      const newAdmin = new Admin({
        username,
        password: hashedPassword,
        selectedNumber: 0,
        amount: 0,
      });
      await newAdmin.save();
    } else if (role === "user") {
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        role,
      });
      await newUser.save();
    } else {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    res
      .status(200)
      .json({ message: "Sign-up successful", redirectUrl: "/login" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login route
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login request for:", username);

    // Check if the user exists in the Admin collection first
    let user = await Admin.findOne({ username });
    let userRole = "admin";

    // If the user is not found in Admin, check the User collection
    if (!user) {
      user = await User.findOne({ username });
      userRole = "user";
    }

    console.log("User found:", user);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    console.log("Password correct:", isPasswordCorrect);

    if (!isPasswordCorrect) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }

    req.session.user = {
      username: user.username,
      role: userRole,
    };

    return res.json({
      success: true,
      role: userRole,
      message: "Login successful",
      redirectUrl: "/dashboard",
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Dashboard route - Handles admin/user dashboard redirection
app.get("/dashboard", async (req, res) => {
  const user = req.session.user;
  if (!user) {
    return res.redirect("/login");
  }

  try {
    if (user.role === "admin") {
      const adminData = await Admin.findOne({ username: user.username });
      if (adminData) {
        res.sendFile(path.join(__dirname, "../Frontend/admin.html"));
      } else {
        res
          .status(404)
          .json({ success: false, message: "Admin data not found" });
      }
    } else if (user.role === "user") {
      res.sendFile(path.join(__dirname, "../Frontend/user.html"));
    } else {
      res.status(403).json({ success: false, message: "Unauthorized access" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Set number and amount (Admin)
app.post("/set-number", async (req, res) => {
  try {
    const { number, amount } = req.body;
    await Admin.findOneAndUpdate(
      { username: req.session.user.username },
      { selectedNumber: number, amount },
      { upsert: true }
    );

    res.json({ success: true, message: "Number set successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// Guess number (User)
app.post("/guess-number", async (req, res) => {
  try {
    const { number } = req.body;
    const admin = await Admin.findOne({});

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin data not found" });
    }

    const user = await User.findOne({ username: req.session.user.username });

    let status = "Wrong";
    if (admin.selectedNumber == number) {
      user.wallet += admin.amount;
      status = "Correct";
    } else {
      user.wallet -= admin.amount;
    }

    user.guessedNumber = number;
    user.guessStatus = status;

    await user.save();

    res.json({
      success: true,
      message: status === "Correct" ? "Correct Guess" : "Wrong Guess",
      status,
      wallet: user.wallet,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Fetch details for admin
app.get("/details", async (req, res) => {
  try {
    const users = await User.find({});
    const admin = await Admin.findOne({});

    const details = users.map((user) => {
      const isParticipating = user.wallet !== 1000;
      return {
        username: user.username,
        email: user.email,
        number: isParticipating ? user.guessedNumber : "-",
        status: isParticipating ? user.guessStatus : "-",
        wallet: user.wallet,
      };
    });

    res.json({ success: true, details });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Logout route
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Fallback route for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/index.html"));
});

// Start the server
app.listen(3000, () => console.log("Server started at http://localhost:3000"));
