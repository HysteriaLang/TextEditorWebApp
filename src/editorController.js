const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
    res.render("pages/editor.ejs", { title: 'Text Editor - Edit Document' });
});

router.post("/api/load", (req, res) => {
    const { filename } = req.body;
    res.json({ success: true, content: 'Sample loaded content', filename });
});

module.exports = router;