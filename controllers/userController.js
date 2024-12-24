const User = require("../models/userModel");
const Url = require("../models/urlModel");

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      username: user.username,
      email: user.email,
      id: req.user.userId,
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.user.userId });
    await Url.deleteMany({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(204).json({ message: "Deleted Successfully" });
  } catch (err) {
    console.error("Error deleting profile:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
