// Crawl 1 lan tu dong lenh:  npm run crawl
import { crawlAll } from './crawlers/index.js';

const r = await crawlAll();
console.log(JSON.stringify(r, null, 2));
