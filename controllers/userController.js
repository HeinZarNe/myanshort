exports.getProfile = (req, res) => {
  console.log(req.user);
  res.json({
    username: req.user.username,
    email: req.user.email,
    id: req.user.id,
  });
};
