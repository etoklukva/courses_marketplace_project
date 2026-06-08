const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const { ethers } = require("ethers");

const app = express();
const db = new Database("course_content.db");

app.use(cors());
app.use(express.json());

db.prepare(`
  CREATE TABLE IF NOT EXISTS course_blocks_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    block_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL
  )
`).run();

app.post("/api/course-blocks", (req, res) => {
  try {
    const { courseId, blockId, title, content } = req.body;

    if (courseId === undefined || blockId === undefined || !title || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const contentHash = ethers.keccak256(ethers.toUtf8Bytes(content));

    db.prepare(`
      INSERT INTO course_blocks_content (course_id, block_id, title, content)
      VALUES (?, ?, ?, ?)
    `).run(courseId, blockId, title, content);

    res.json({ success: true, contentHash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/course-blocks/:courseId/:blockId", (req, res) => {
  try {
    const { courseId, blockId } = req.params;

    const row = db.prepare(`
      SELECT course_id, block_id, title, content
      FROM course_blocks_content
      WHERE course_id = ? AND block_id = ?
    `).get(courseId, blockId);

    if (!row) {
      return res.status(404).json({ error: "Block not found" });
    }

    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
});