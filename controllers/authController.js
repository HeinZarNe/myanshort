const passport = require("passport");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendVerificationEmail = (user, req, res) => {
  console.log("email is sending");
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
  const url = `${process.env.APP_URL}auth/verify-email?token=${token}`;
  transporter.sendMail(
    {
      to: user.email,
      subject: "Verify your email",
      html: `Click <a href="${url}">here</a> to verify your email.`,
    },
    (err, info) => {
      if (err) {
        console.error("Error sending email:", err);
      } else {
        console.log("Email sent: " + info.response);
      }
    }
  );
};

// exports.googleLogin = async (req, res) => {
//   const oauth2Client = new google.auth.OAuth2(
//     process.env.GOOGLE_CLIENT_ID,
//     process.env.GOOGLE_CLIENT_SECRET,
//     "http://localhost:3000/api/auth/google/callback"
//   );

//   const authUrl = oauth2Client.generateAuthUrl({
//     scope: ["profile", "email"],
//   });
//   z;
//   res.redirect(authUrl);
// };

exports.googleCallback = async (req, res, next) => {
  const user = req.user;
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
  const responseObj = {
    token,
    refreshToken,
    user: { username: user.username, email: user.email, id: user._id },
  };
  res.redirect(
    `${process.env.FRONTEND_URL}auth/google/callback?user=${encodeURIComponent(
      JSON.stringify(responseObj)
    )}`
  );
};
exports.register = async (req, res) => {
  const { email, password, username } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    username,
    email,
    password: hashedPassword,
    isVerified: false,
  });
  try {
    await newUser.save();
    sendVerificationEmail(newUser, req, res);
    res.status(201).json({
      message:
        "User is registered successfully. Please check your email to verify your account.",
    });
  } catch (err) {
    if (err.code === 11000) {
      console.error(err);
      res.status(409).json({ message: "Email already exists" });
    } else {
      console.error("Error registering user:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};

exports.googleHandleError = async (req, res) => {
  const errorMessage = req.session.authError || "Verification failed";
  delete req.session.authError;
  res.redirect(
    `${process.env.FRONTEND_URL}login?error=${encodeURIComponent(errorMessage)}`
  );
};

exports.login = async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  try {
    const user = await User.findOne({
      $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
    });
    if (user && bcrypt.compare(password, user.password)) {
      if (!user.isVerified) {
        return res
          .status(401)
          .json({ message: "Please verify your email before logging in." });
      }
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );
      res.json({
        message: "Login successful",
        token,
        refreshToken,
        user: { username: user.username, email: user.email, id: user._id },
      });
    } else {
      res.status(401).json({ message: "Invalid email/username or password" });
    }
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ message: "Refresh token required" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ accessToken });
  } catch (err) {
    console.error("Error refreshing token:", err);
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

exports.verify_email = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(400).send("Invalid token");
    }

    const entry = await User.findByIdAndUpdate(
      { _id: decoded.userId },
      { isVerified: true }
    );

    if (!entry) {
      return res
        .status(404)
        .redirect(`${process.env.FRONTEND_URL}verify-email`);
    }

    res.redirect(`${process.env.FRONTEND_URL}login?message=Verified`);
  } catch (err) {
    console.error(err);
    res.status(400).send("Invalid or expired token");
  }
};
exports.requestNewVerificationEmail = async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User with this email not found" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }
    sendVerificationEmail(user, req, res);
    res.status(200).json({ message: "Verification email sent" });
  } catch (err) {
    console.error("Error requesting new verification email:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
exports.logout = (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
};
