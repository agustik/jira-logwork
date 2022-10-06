#!/usr/bin/node

import fs from 'fs/promises';
import yargs from 'yargs';
import { parse } from 'csv';

const argv = yargs(process.argv).argv


async function readCSV(file){
  const content = await fs.readFile(file);

  return new Promise((resolve, reject) => {
    parse(content.toString(), {
      delimiter: ',',
      columns: true,
    }, function (err, recoords){
      if (err) return reject(err);
      return resolve(recoords);
    });
  });

}

function hours(time){
  if (! time ) return `0h`;
  
  const h = (time / 3600).toFixed(2);
  
  return `${h}h`
}


function sum(arr){
  return arr.reduce((a,b) => {
    return a+b;
  }, 0);
}


const since = new Date(argv.since || 0);
const file = argv.f || argv.file;
const name = argv.n || argv.name || process.env.JIRA_NAME;

if (! file ){
  console.error(`No file set`);
  process.exit(1);
}

if (!name) {
  console.error(`No name set, you can use -n --name or JIRA_NAME env`);
  process.exit(1);
}

const records = await readCSV(file);
const myRecords = records.filter(rec => {
  return (rec.Assignee === name);
}).filter(rec => {
  return (new Date(rec.Updated) > since)
})
const totalHours = sum(myRecords.map(rec => {
  return parseInt(rec['Time Spent']);
}).filter(r => r));
myRecords.forEach(rec => {
  const timeSpent = rec['Time Spent'];
  console.log(`[${rec.Updated}] ${rec.Summary} : ${hours(timeSpent)}`);
});
console.log(`Total hours: ${hours(totalHours)}`)


