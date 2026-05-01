import express from 'express';
import path from 'node:path';

const parseArg = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return fallback;
  }

  return process.argv[index + 1] ?? fallback;
};

const port = Number(parseArg('--port', process.env.PORT || '4173'));
const host = parseArg('--host', process.env.HOST || '127.0.0.1');
const distDir = path.resolve(process.cwd(), 'dist');
const indexFile = path.join(distDir, 'index.html');

const app = express();
app.disable('x-powered-by');

app.use(express.static(distDir, { index: false }));

app.get('*', (_request, response) => {
  response.sendFile(indexFile);
});

app.listen(port, host, () => {
  console.log(`SPA test server listening on http://${host}:${port}`);
});
