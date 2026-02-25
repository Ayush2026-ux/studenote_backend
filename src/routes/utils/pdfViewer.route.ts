import { Router } from "express";

const router = Router();

router.get("/pdf-viewer", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Studenote PDF Viewer</title>
    <style>
      html, body, #viewer {
        margin: 0; padding: 0; height: 100%; background: #000;
      }
      iframe { width: 100%; height: 100%; border: 0; background: #000; }
    </style>
  </head>
  <body>
    <iframe id="viewer"></iframe>
    <script>
      const params = new URLSearchParams(window.location.search);
      const url = params.get("url");
      if (url) {
        document.getElementById("viewer").src =
          "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +
          encodeURIComponent(url);
      }
    </script>
  </body>
</html>
  `);
});

export default router;