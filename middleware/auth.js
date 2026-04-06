// Middleware перевірки авторизації адміна
function requireAuth(req, res, next) {
  if (req.session && req.session.adminLoggedIn) {
    return next();
  }
  // Якщо не авторизований — редірект на логін
  return res.redirect('/admin');
}

module.exports = { requireAuth };
