import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.mp4':'video/mp4','.woff2':'font/woff2','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{
 try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 let file=path.resolve(root,'.'+pathname);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end('Not found');return;}
 const size=fs.statSync(file).size;
 const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
 if(req.headers.range){
 const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
 if(!match){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}
 const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),size-1):size-1;
 if(start>=size||end<start){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}
 res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});
 if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file,{start,end}).pipe(res);
 }else{res.writeHead(200,{...headers,'Content-Length':size});if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file).pipe(res);}
 }catch{res.writeHead(400).end('Bad request');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
