const es=require('esbuild'),fs=require('fs');
es.buildSync({entryPoints:['src/main.js'],bundle:true,minify:true,format:'iife',outfile:'/tmp/b.js',target:'es2020'});
const js=fs.readFileSync('/tmp/b.js','utf8').replace(/<\/script/g,'<\\/script');
fs.writeFileSync('pub2/index.html',fs.readFileSync('src/page.html','utf8').replace('/*BUNDLE*/',()=>js));
console.log('ok',(fs.statSync('pub2/index.html').size/1e3|0)+'KB');
