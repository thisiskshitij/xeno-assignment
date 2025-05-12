const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); // Import your User model

// Passport Serialize User: What data to store in the session after successful login
// We store the user's MongoDB _id in the session
passport.serializeUser((user, done) => {
  console.log('Passport: Serializing user:', user.id);
  done(null, user.id); // user.id is the MongoDB _id
});

// Passport Deserialize User: How to get the user data from the id stored in the session
// This function is called on subsequent requests (e.g., when checking if user is logged in)
passport.deserializeUser(async (id, done) => {
  console.log('Passport: Deserializing user:', id);
  try {
    const user = await User.findById(id);
    if (!user) {
        console.warn('Passport: User not found during deserialization for ID:', id);
         return done(null, false); // User not found
    }
    console.log('Passport: User deserialized successfully:', user.name);
    done(null, user); // Attach the user document to req.user
  } catch (err) {
    console.error('Passport: Error during deserialization for ID:', id, err);
    done(err, null);
  }
});


// Google OAuth 2.0 Strategy Configuration
passport.use(new GoogleStrategy({
    // Read Client ID and Secret from environment variables (.env file)
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // This is the callback URL Google will redirect to after authentication
    callbackURL: '/auth/google/callback', // Relative path, adjust if needed for production
    // Optional: Pass profile fields you need (email and profile are default)
    // scope: ['profile', 'email'] // These are the default scopes for GoogleStrategy
  },
  // Verify Callback Function: Called after Google successfully authenticates the user
  // profile contains the user's Google profile information
  async (accessToken, refreshToken, profile, done) => {
    console.log('Passport: Google OAuth Verify Callback triggered.');
    console.log('Google Profile ID:', profile.id);
    console.log('Google Profile Name:', profile.displayName);
    console.log('Google Profile Email:', profile.emails ? profile.emails[0].value : 'N/A');

    // Find or Create User logic
    try {
      // 1. Check if a user with this Google ID already exists in your DB
      const existingUser = await User.findOne({ googleId: profile.id });

      if (existingUser) {
        console.log('Passport: Existing user found:', existingUser.name);
        // If user exists, pass the user document to done()
        // Passport will then serialize this user and establish a session
        done(null, existingUser);
      } else {
        console.log('Passport: Creating new user...');
        // If user does not exist, create a new user document in your DB
        const newUser = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails ? profile.emails[0].value : 'no-email@example.com' // Use a placeholder if email is not available
        });
        const savedUser = await newUser.save();
        console.log('Passport: New user created:', savedUser.name);
        // Pass the newly created user document to done()
        done(null, savedUser);
      }
    } catch (err) {
      console.error('Passport: Error in Google OAuth verify callback:', err);
      done(err, null); // Pass the error to done()
    }
  }
));