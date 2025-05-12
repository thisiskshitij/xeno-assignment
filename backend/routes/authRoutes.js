const router = require('express').Router();
const passport = require('passport');

// --- Google OAuth Login Route ---
// This route initiates the Google OAuth flow.
// Passport's google strategy middleware redirects the user to Google's login page.
router.get('/google',
  passport.authenticate('google', {
    // Define the scopes (permissions) your application needs from the user's Google account
    // 'profile' gets basic profile info (name, picture)
    // 'email' gets the user's primary email address
    scope: ['profile', 'email']
  })
);

// --- Google OAuth Callback Route ---
// This is the URL Google redirects the user to after they authenticate.
// Passport handles the callback, authenticates the user, and calls the verify callback in passportSetup.js.
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/login/failed', // Redirect to a failure page/route on error
  }),
  // If authentication succeeds, this function is called
  (req, res) => {
    // Successful authentication, redirect home or to a dashboard
    console.log('Authentication successful! User:', req.user.name);
    // You can redirect the user to your frontend application's main page
    // We'll use a simple success redirect for now. You might redirect to 'http://localhost:3001/dashboard' in a real app.
    res.redirect(process.env.FRONTEND_URL); // Redirect to the root route for now
  }
);

// --- Authentication Failure Route (Optional) ---
// Route for handling failed authentication
router.get('/login/failed', (req, res) => {
    console.log('Authentication failed.');
    res.status(401).send('Authentication Failed');
});

// --- Check Authentication Status Route ---
// Route to check if a user is currently authenticated
// Can be called by the frontend to determine login status
router.get('/check', (req, res) => {
  console.log('Checking authentication status. req.isAuthenticated:', req.isAuthenticated());
  if (req.isAuthenticated()) { // req.isAuthenticated() is added by Passport
    // If authenticated, send user info (avoid sending sensitive data)
    res.status(200).json({
      isAuthenticated: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        // Only send necessary user info
      }
    });
  } else {
    // If not authenticated
    res.status(200).json({ isAuthenticated: false, user: null });
  }
});

// --- Logout Route ---
// Route to log the user out
router.get('/logout', (req, res, next) => {
    console.log('Attempting logout.');
    req.logout((err) => { // req.logout() is added by Passport
        if (err) {
            console.error('Error during logout:', err);
            return next(err); // Pass error to Express error handler
        }
        // Session is destroyed, user is logged out
        console.log('User logged out successfully.');
        // Redirect or send a success response
        // You might redirect back to the frontend's login page
        res.redirect('/'); // Redirect to root after logout for now
    });
});


module.exports = router;