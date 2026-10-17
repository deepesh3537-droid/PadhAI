import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../../src/app.js";
import {
  sanitizeFilename,
  validateAndExtractSyllabusText,
  extractDeterministicSyllabus
} from "../../src/services/syllabus.service.js";
import { ValidationError } from "../../src/utils/errors.js";

/**
 * TEST_PLAN §10: Syllabus Upload and Processing Test Suite (Phase 9)
 *
 * Verifies:
 * 1. Wrong file type rejected (only .pdf, .txt, .md allowed).
 * 2. Oversized file rejected (> 5 MB).
 * 3. Unsafe/path traversal filenames sanitized properly.
 * 4. Scanned/unreadable/empty files trigger an explicit friendly error message (NEVER inventing topics).
 * 5. Structural syllabus extraction preserves units/modules and flags ambiguities.
 * 6. Authentication guards on /api/syllabus endpoints.
 */

test("TEST_PLAN §10: Unsafe/odd filename is sanitized against path traversal", () => {
  // Path traversal attacks
  assert.equal(sanitizeFilename("../../etc/passwd.pdf"), "passwd.pdf");
  assert.equal(sanitizeFilename("..\\..\\windows\\system32\\cmd.exe"), "cmd.exe");
  assert.equal(sanitizeFilename("folder/nested/syllabus.txt"), "syllabus.txt");

  // Null byte injection
  assert.equal(sanitizeFilename("syllabus.txt\0.exe"), "syllabus.txt_.exe");

  // Odd special characters
  assert.equal(sanitizeFilename("My Cool Syllabus!@#$%^&*().md"), "My_Cool_Syllabus__________.md");

  // Empty or invalid input
  assert.equal(sanitizeFilename(""), "syllabus_document");
  assert.equal(sanitizeFilename(null), "syllabus_document");
});

test("TEST_PLAN §10: Wrong file type is rejected with ValidationError", async () => {
  const invalidFiles = [
    { name: "script.js", buffer: Buffer.from("console.log('hello');") },
    { name: "malware.exe", buffer: Buffer.from("MZ4949494949") },
    { name: "photo.png", buffer: Buffer.from("\x89PNG\r\n\x1a\n") }
  ];

  for (const file of invalidFiles) {
    await assert.rejects(
      async () => {
        await validateAndExtractSyllabusText({
          buffer: file.buffer,
          originalName: file.name
        });
      },
      (err) => {
        assert.ok(err instanceof ValidationError);
        assert.match(err.message, /Unsupported file type/);
        return true;
      }
    );
  }
});

test("TEST_PLAN §10: Oversized file exceeding 5 MB is rejected", async () => {
  // 5 MB + 1 byte
  const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, "A");

  await assert.rejects(
    async () => {
      await validateAndExtractSyllabusText({
        buffer: oversizedBuffer,
        originalName: "large_syllabus.txt"
      });
    },
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /exceeds the 5 MB limit/);
      return true;
    }
  );
});

test("TEST_PLAN §10: Scanned/unreadable/empty file produces an explicit error, not invented topics", async () => {
  // Document with under 50 characters (e.g. empty or OCR failure)
  const unreadableBuffer = Buffer.from("Scan page 1.\nNo text stream.");

  await assert.rejects(
    async () => {
      await validateAndExtractSyllabusText({
        buffer: unreadableBuffer,
        originalName: "scanned_syllabus.txt"
      });
    },
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /We could not extract readable text from this file/);
      assert.match(err.message, /scanned, image-only, or empty/);
      return true;
    }
  );
});

test("TEST_PLAN §10: Corrupted PDF produces clear actionable error message", async () => {
  const corruptedPdfBuffer = Buffer.from("%PDF-corrupted-random-binary-content-1234567890");

  await assert.rejects(
    async () => {
      await validateAndExtractSyllabusText({
        buffer: corruptedPdfBuffer,
        originalName: "broken.pdf"
      });
    },
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /We could not read this PDF/);
      return true;
    }
  );
});

test("TEST_PLAN §10: Valid plain text and markdown syllabi extract text cleanly", async () => {
  const validText = `Computer Networks Syllabus (CS-301)
Course Overview: Introduction to modern data communication and OSI/TCP-IP stacks.

Unit 1: Physical and Data Link Layer
- Network topologies: star, mesh, bus
- Framing and error detection algorithms (CRC)
- Medium Access Control: CSMA/CD and CSMA/CA

Unit 2: Network Layer and Routing
- IPv4 and IPv6 addressing and subnetting
- Routing algorithms: Distance Vector and Link State (Dijkstra)
- Border Gateway Protocol (BGP)`;

  const extracted = await validateAndExtractSyllabusText({
    buffer: Buffer.from(validText, "utf-8"),
    originalName: "networks_syllabus.txt"
  });

  assert.equal(extracted.originalName, "networks_syllabus.txt");
  assert.ok(extracted.charCount > 100);
  assert.match(extracted.text, /Computer Networks Syllabus/);
  assert.match(extracted.text, /Unit 1: Physical and Data Link Layer/);
});

test("TEST_PLAN §10: Structure preservation and ambiguity detection in syllabus parsing", () => {
  const syllabusText = `Operating Systems Syllabus
Unit 1: Process Management
- Process scheduling: FIFO, Round Robin, Priority
- Inter-process communication and semaphores

Unit 2: Advanced Topics

Unit 3: File Systems and Storage
- Disk scheduling: SCAN, C-SCAN
- Inode structures`;

  const parsed = extractDeterministicSyllabus(syllabusText, "Operating Systems");

  assert.equal(parsed.title, "Operating Systems Syllabus");
  assert.equal(parsed.modules.length, 3);
  assert.equal(parsed.modules[0].topics.length, 2);

  // Unit 2 had no topics, so an ambiguity must be flagged
  assert.ok(parsed.ambiguities.length > 0);
  const foundEmptyUnitAmbiguity = parsed.ambiguities.some((a) => a.includes("Unit 2") || a.includes("no specific sub-topics"));
  assert.ok(foundEmptyUnitAmbiguity);
});

test("TEST_PLAN §10: Unstructured flat syllabus groups topics and flags ambiguity", () => {
  const flatText = `Fullstack Web Development
HTML5 semantic elements
CSS Grid and Flexbox layouts
JavaScript asynchronous promises
Express RESTful API design`;

  const parsed = extractDeterministicSyllabus(flatText, "Web Dev");

  assert.equal(parsed.title, "Fullstack Web Development");
  assert.equal(parsed.modules.length, 1);
  assert.ok(parsed.modules[0].topics.length >= 3);

  // Flat syllabus without explicit units must flag ambiguity
  assert.ok(parsed.ambiguities.some((a) => a.includes("does not specify explicit units")));
});

test("TEST_PLAN §10: /api/syllabus endpoints require authentication (401)", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const resExtract = await fetch(`http://127.0.0.1:${port}/api/syllabus/extract`, {
      method: "POST"
    });
    assert.equal(resExtract.status, 401);

    const resParse = await fetch(`http://127.0.0.1:${port}/api/syllabus/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "sample text" })
    });
    assert.equal(resParse.status, 401);

    const resGen = await fetch(`http://127.0.0.1:${port}/api/syllabus/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parsedSyllabus: { title: "Test", modules: [] } })
    });
    assert.equal(resGen.status, 401);
  } finally {
    server.close();
  }
});
