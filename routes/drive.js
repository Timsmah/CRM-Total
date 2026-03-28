const express = require('express');
const router  = express.Router();

router.get('/folder/:folderId', async (req, res) => {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'GOOGLE_DRIVE_API_KEY not configured' });

  const { folderId } = req.params;
  const url = `https://www.googleapis.com/drive/v3/files`
    + `?q='${folderId}'+in+parents+and+mimeType+contains+'image/'`
    + `&fields=files(id,name,mimeType)`
    + `&orderBy=name`
    + `&pageSize=20`
    + `&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const files = (data.files || []).map(f => ({
      id       : f.id,
      name     : f.name,
      thumbnail: `https://drive.google.com/thumbnail?id=${f.id}&sz=w800`
    }));
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
