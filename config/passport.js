const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userModel");

const passportConfig = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `http://localhost:3000/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if a user with the same Google ID exists
          let user = await User.findOne({ googleId: profile.id });
          // If no user exists with the Google ID, check by email
          if (!user) {
            const existingUser = await User.findOne({
              email: profile.emails[0].value,
            });

            if (existingUser) {
              // If a user with the same email exists, return a message
              return done(null, false, {
                message: "User with this email already exists",
              });
            } else {
              // Create a new user if no conflict
              user = await User.create({
                googleId: profile.id,
                username: profile.displayName,
                email: profile.emails[0].value,
                isVerified: true,
              });
            }
          }

          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};

module.exports = passportConfig;
