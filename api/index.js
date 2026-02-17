export default function handler(req, res) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>RSS Service - Test</title>
  <style>
    body { font-family: system-ui; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>RSS Service</h1>
  <p>If you see this, the serverless function is working!</p>
  <p>Request path: ${req.url}</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
