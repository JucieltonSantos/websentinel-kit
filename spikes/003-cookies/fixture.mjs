import https from 'node:https';
import {readFileSync} from 'node:fs';
const key = readFileSync(process.env.WSK_TLS_KEY);
const cert = readFileSync(process.env.WSK_TLS_CERT);
const server = https.createServer({key,cert}, (req,res) => {
  if (req.url === '/setup') res.setHeader('Set-Cookie', [
    'session=CANARY_COOKIE_VALUE_A; Path=/target; HttpOnly; Secure; SameSite=None',
    'sid=CANARY_COOKIE_VALUE_B; Path=/target; SameSite=Lax',
    'unknown=CANARY_COOKIE_VALUE_C; Path=/target; Secure',
    'sessionid=CANARY_COOKIE_VALUE_D; Path=/other; Secure',
    'sess=CANARY_COOKIE_VALUE_E; Path=/target; Secure; SameSite=None; Partitioned',
  ]);
  res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'});
  res.end('Local synthetic cookies fixture.');
});
server.listen(4193,'127.0.0.1',() => console.log('Fixture listening on https://127.0.0.1:4193'));
