// Middleware to ensure a user is authenticated
const ensureAuthenticated = (req, res, next) => {
  // req.isAuthenticated() is a method added by Passport
  console.log('Auth Middleware: Checking authentication status for route...');
  if (req.isAuthenticated()) {
    console.log('Auth Middleware: User is authenticated.');
    // If authenticated, proceed to the next middleware/route handler
    return next();
  } else {
    console.warn('Auth Middleware: User is NOT authenticated. Sending 401.');
    // If not authenticated, send a 401 Unauthorized response
    // You could also redirect them to a login page/route
    res.status(401).json({ message: 'Unauthorized: Please log in' });
  }
};

module.exports = { ensureAuthenticated };