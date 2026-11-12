import {readFileSync, writeFileSync} from 'node:fs';
const root = new URL('../', import.meta.url);
const tokens = JSON.parse(readFileSync(new URL('tokens/speculara.json', root), 'utf8'));
const flat = new Map();
function walk(node, path = '') {
 if ('$value' in node) { flat.set(path,node); return; }
 for (const [key,value] of Object.entries(node)) if (!key.startsWith('$')) walk(value,path ? `${path}.${key}` : key);
}
walk(tokens);
function resolve(path, chain = []) {
 if(chain.includes(path)) throw new Error(`Circular token alias: ${[...chain,path].join(' -> ')}`);
 const token=flat.get(path);
 if(!token) throw new Error(`Unknown token: ${path}`);
 const value = token.$value;
 const cssValue = token.$type === 'dimension' || token.$type === 'duration'
  ? `${value.value}${value.unit}`
  : token.$type === 'fontFamily'
   ? value.map(font => font.includes(' ') ? `"${font}"` : font).join(', ')
   : String(value);
 return cssValue.replace(/\{([^}]+)\}/g,(_,ref)=>resolve(ref,[...chain,path]));
}
const lines = [];
for(const [path,token] of flat) {
 const name=token.$extensions?.speculara?.css;
 if(name) lines.push(`  ${name}: ${resolve(path)};`);
}
const output=`/* Generated from tokens/speculara.json. Run npm run tokens:build. */\n@theme static {\n${lines.join('\n')}\n}\n`;
const target=new URL('src/tokens.css', root);
if(process.argv.includes('--check')) {
 let actual='';try {actual=readFileSync(target,'utf8');} catch {}
 if(actual!==output) {console.error('Stale src/tokens.css. Run npm run tokens:build.');process.exitCode=1;}
} else writeFileSync(target,output);
