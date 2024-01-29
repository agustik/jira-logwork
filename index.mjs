#!/usr/bin/node

import fs from 'fs/promises';
import yargs from 'yargs';
import { parse } from 'csv';

const argv = yargs(process.argv).argv;


const myUUID = '557057:860273b0-9d2c-4322-acc0-aa60cdedd7c7';

async function readCSV(file){
  const content = await fs.readFile(file);


  return new Promise((resolve, reject) => {
    parse(content.toString(), {
      delimiter: ',',
      columns: true,
      group_columns_by_name: true,
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


if (argv.h || argv.help){
  console.log(`
  Usage: ${argv.$0} -f --file <filename> -n --name --since <timestamp>
  
  `)
  process.exit(0)
}


const since = new Date(argv.since || 0);
const file = argv.f || argv.file;
// const name = argv.n || argv.name || process.env.JIRA_NAME;




if (! file ){
  console.error(`No file set`);
  process.exit(1);
}

// if (!name) {
//   console.error(`No name set, you can use -n --name or JIRA_NAME env`);
//   process.exit(1);
// }



if (since.toString() === 'Invalid Date'){
  console.log('Unablee to parse date', argv.since);
  process.exit(1);
}


function parseWorkLog(record){

  function parse(lwstring){

    const lw = lwstring.split(';');

    if (lw.length < 2){
      return null;
    }
    return {
      text: lw[0],
      date: new Date(lw[1]),
      uuid: lw[2],
      time: parseInt(lw[3]),
    }
  }
  
  const logwork = record['Log Work'];

  record.logwork = logwork.map(lw => {
    return parse(lw);
  }).filter(lw => {
    if (! lw ) return false;

    return (lw.uuid === myUUID);
  });

  return record;
}
const records = await readCSV(file);

const allRecords = records.map(item => parseWorkLog(item));

function parseDate(dateString){


  const hours = parseInt(dateString.split(' ').pop().substring(0,2));

  const date = new Date(dateString);

  if (hours < 12){
    date.setHours(hours + 12)
  }
  return dateString;
}


const myRecords = allRecords.filter(rec => {
  if (rec['Assignee Id'] === myUUID) {
    return true;
  }

  return rec.logwork.some(lw => {
    return (lw.uuid === myUUID)
  });
}).filter(rec => {

  if (! rec.logwork ) return false;

  return rec.logwork.some(lw => {
    return (lw.date >= since);
  });
})


const totalHours = sum(myRecords.map(rec => {
  return rec.logwork.filter(lw => {
    return (lw.date >= since);
  }).map(lw => lw.time).reduce((a, b) => a + b);
}).filter(r => r));

myRecords.map(record => {
  const fields = ['Created', 'Updated', 'Last Viewed'];

  fields.forEach(field => {
    record[field] = parseDate(record[field])
  });

  return record;
}).sort((a, b) => {
  return new Date(a.Created) - new Date(b.Created);
}).forEach(rec => {
  const lwTimeSpent = rec.logwork.filter(lw => {
    return (lw.date >= since);
  }).map(lw => lw.time).reduce((a,b) => a+b)
  // console.log(rec)
  const key = rec['Issue key'];
  console.log(`[${rec.Updated}] ${key}/${rec.Summary}: ${hours(lwTimeSpent)}`);
  rec.logwork.forEach(lw => {
    console.log(`  [${lw.date} ${lw.text}] ${hours(lw.time)}`)
  })
});
console.log(`Total hours: ${hours(totalHours)}`)


