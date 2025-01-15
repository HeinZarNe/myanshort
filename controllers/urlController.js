const Url = require("../models/urlModel");
const shortid = require("shortid");
const mongoose = require("mongoose");
const validator = require("validator");
exports.publicShortenUrl = async (req, res) => {
  let { originalUrl } = req.body;
  if (!/^https?:\/\//i.test(originalUrl)) {
    originalUrl = `https://${originalUrl}`;
  }
  if (!validator.isURL(originalUrl)) {
    return res.status(400).json({ message: "Invalid URL" });
  }
  const shortId = shortid.generate();
  const newUrl = new Url({ shortId, originalUrl });
  const existing = await Url.findOne({ originalUrl });

  if (existing) {
    res.json({ newLink: existing });
  } else {
    try {
      const newLink = await newUrl.save();
      res.json({ newLink });
    } catch (err) {
      if (err.code === 11000) {
        res.status(409).json({ message: "URL already exists" });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
        console.error(err);
      }
    }
  }
};

exports.privateShortenUrl = async (req, res) => {
  let { originalUrl, userId, name } = req.body;
  if (!userId) {
    return res.status(403).json({ message: "Invalid Access" });
  }
  if (!/^https?:\/\//i.test(originalUrl)) {
    originalUrl = `https://${originalUrl}`;
  }

  if (!validator.isURL(originalUrl)) {
    return res.status(400).json({ message: "Invalid URL" });
  }
  const shortId = shortid.generate();
  const newUrl = new Url({ shortId, originalUrl, userId, name });
  const existing = await Url.findOne({ originalUrl });

  if (existing) {
    res.json({ newLink: existing, exists: true });
  } else {
    try {
      const newLink = await newUrl.save();
      res.json({ newLink });
    } catch (err) {
      if (err.code === 11000) {
        res.status(409).json({ message: "URL already exists" });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
        console.error(err);
      }
    }
  }
};
exports.modifyUrl = async (req, res) => {
  const { id } = req.params;
  const { link, name } = req.body;

  // Check if the ID is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  try {
    const updateFields = {};
    if (link) updateFields.originalUrl = link;
    if (name) updateFields.name = name;
    const updatedUrl = await Url.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    if (!updatedUrl) {
      return res.status(404).json({ message: "URL not found" });
    }

    res.json(updatedUrl);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error", error: err });
    console.error(err);
  }
};
exports.redirectUrl = async (req, res) => {
  const { shortId } = req.params;
  try {
    const entry = await Url.findOne({ shortId });
    if (entry) {
      entry.clicks += 1;
      await entry.save();
      res.redirect(entry.originalUrl);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}expired-url`);
    }
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
    console.error(err);
  }
};

exports.deleteUrl = async (req, res) => {
  const { shortId } = req.params;
  try {
    const entry = await Url.findOneAndDelete({ shortId });
    if (entry) {
      res.status(200).json({ message: "Url deleted successfully" });
    } else {
      res.status(404).json({ message: "URL not found" });
    }
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getAllUrls = async (req, res) => {
  try {
    const urls = await Url.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    });

    res.json(urls);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
    console.error(err);
  }
};

exports.getUrlDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const url = await Url.findById(id);
    res.json(url);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error", error: err });
    console.error(err);
  }
};
