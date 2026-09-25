import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const fail = (message) => { console.error("VALIDATION ERROR:", message); process.exitCode = 1; };

const catalog = read("academia/courses.js");
const academyIndex = read("academia/index.html");
const home = read("index.html");

const ids = [...catalog.matchAll(/"id"\s*:\s*"([^"]+)"/g)].map(m => m[1]);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);

if (ids.length < 20) fail(`Academy should expose at least 20 courses; found ${ids.length}.`);
if (dupes.length) fail(`Duplicate Academy course IDs: ${[...new Set(dupes)].join(", ")}`);

for (const asset of ["courses.js", "app.js"]) {
  if (!academyIndex.includes(`src="${asset}"`)) fail(`academia/index.html is missing ${asset}`);
}

const sponsorChecks = [
  "Establecimiento",
  "Don Avelino",
  "De cualquier punto del país, directo a la feria.",
  "https://establecimientodonavelino.ar/",
  "5493482409400",
  "https://www.instagram.com/establecimientodonavelino/"
];
for (const marker of sponsorChecks) {
  if (!home.includes(marker)) fail(`Homepage is missing Don Avelino marker: ${marker}`);
}

if (!process.exitCode) {
  console.log(`Platform validation OK: ${ids.length} Academy courses, unique IDs, Academy assets present, Don Avelino links present.`);
}
