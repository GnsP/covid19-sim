const https = require('https');
const fs = require('fs');

const dailydataurl = "https://api.covid19india.org/states_daily.json";
const latestdataurl = "https://api.covid19india.org/data.json";

const oldData = JSON.parse(fs.readFileSync('./data.json'));

const now = new Date();
//now.setDate(now.getDate()+1);
const today = dateFormat(now);
const fromDate = oldData.before;
const yd = new Date();
yd.setDate(now.getDate()-1);
const yday = dateFormat(yd);

const statecodeToName = {
  "tt": "country",
  "mh": "Maharashtra",
  "tn": "Tamil Nadu",
  "dl": "Delhi",
  "tg": "Telangana",
  "rj": "Rajasthan",
  "kl": "Kerala",
  "up": "Uttar Pradesh",
  "ap": "Andhra Pradesh",
  "mp": "Madhya Pradesh",
  "ka": "Karnataka",
  "gj": "Gujarat",
  "hr": "Haryana",
  "jk": "Jammu and Kashmir",
  "pb": "Punjab",
  "wb": "West Bengal",
  "or": "Odisha",
  "br": "Bihar",
  "ut": "Uttarakhand",
  "as": "Assam",
  "ch": "Chandigarh",
  "hp": "Himachal Pradesh",
  "la": "Ladakh",
  "an": "Andaman and Nicobar Islands",
  "ct": "Chhattisgarh",
  "ga": "Goa",
  "py": "Puducherry",
  "jh": "Jharkhand",
  "mn": "Manipur",
  "mz": "Mizoram",
  "ar": "Arunachal Pradesh",
  "dn": "Dadra and Nagar Haveli",
  "tr": "Tripura",
  "dd": "Daman and Diu",
  "ld": "Lakshadweep",
  "ml": "Meghalaya",
  "nl": "Nagaland",
  "sk": "Sikkim"
};

// DATA PROCESSING/QUERY UTILS

const pass = _ => true;
const fail = _ => false;

function twodig (x) {
  if (x.toString().length === 1) return '0'+x.toString();
  return x.toString();
}

function dateFormat (d) {
  return `${twodig(d.getDate())}/${twodig(d.getMonth()+1)}/${d.getFullYear()}`;
}

// DATA PROCESSING

function getData (dailydata, _latestdata) {
  const latestdata = _latestdata.reduce((acc, x) => {
    acc[statecodeToName[x.statecode.toLowerCase()]] = {
      total: Number(x.deltaconfirmed),
      recovered: Number(x.deltarecovered),
      died: Number(x.deltadeaths),
      latestdate: x.lastupdatedtime.split(' ')[0],
      cumcon: Number(x.confirmed),
      cumded: Number(x.deaths),
      cumrec: Number(x.recovered),
    };
    return acc;
  }, {});

  const stateCounts = dailydata.states_daily.reduce((acc, x) => {
    let date = dateFormat(new Date(x.date));
    if (!acc[date]) acc[date] = {};

    if (x.status === 'Recovered') {
      acc[date] = Object.keys(x).filter(k => k !== 'date' && k !== 'status')
        .reduce((obj, statecode) => {
          if (!obj[statecodeToName[statecode]]) obj[statecodeToName[statecode]] = {};
          obj[statecodeToName[statecode]].recovered = Number(x[statecode]);
          return obj;
        }, acc[date]);
    }

    if (x.status === 'Deceased') {
      acc[date] = Object.keys(x).filter(k => k !== 'date' && k !== 'status')
        .reduce((obj, statecode) => {
          if (!obj[statecodeToName[statecode]]) obj[statecodeToName[statecode]] = {};
          obj[statecodeToName[statecode]].died = Number(x[statecode]);
          return obj;
        }, acc[date]);
    }

    if (x.status === 'Confirmed') {
      acc[date] = Object.keys(x).filter(k => k !== 'date' && k !== 'status')
        .reduce((obj, statecode) => {
          if (!obj[statecodeToName[statecode]]) obj[statecodeToName[statecode]] = {};
          obj[statecodeToName[statecode]].total = Number(x[statecode]);
          return obj;
        }, acc[date]);
    }

    return acc;
  }, {});

  //stateCounts[latestdate] = latestdata;
  const states = Object.keys(statecodeToName).map(x => statecodeToName[x]).filter(x => x !== 'country');
  const dates = Object.keys(stateCounts);
  const sdata = states.reduce((acc, state) => {
    const curdata = dates.reduce((obj, date) => {
      obj.acc[date] = stateCounts[date][state];
      obj.cumcon += stateCounts[date][state].total;
      obj.cumded += stateCounts[date][state].died;
      obj.cumrec += stateCounts[date][state].recovered;
      return obj;
    }, {acc: {}, cumcon: 0, cumded: 0, cumrec: 0});

    acc[state] = curdata.acc;
    if(!latestdata[state]) {
      acc[state][today] = {
        total: 0,
        recovered: 0,
        died: 0,
      };
      return acc;
    }
    acc[state][today] = {
      total: (curdata.cumcon < latestdata[state].cumcon) ? latestdata[state].total : 0,
      recovered: (curdata.cumrec < latestdata[state].cumrec) ? latestdata[state].recovered : 0,
      died: (curdata.cumded < latestdata[state].cumded) ? latestdata[state].died : 0,
    };

    return acc;
  },  {});

  const curcdata = dates.reduce((obj, date) => {
    obj.acc[date] = stateCounts[date].country;
    obj.cumcon += stateCounts[date].country.total;
    obj.cumrec += stateCounts[date].country.recovered;
    obj.cumded += stateCounts[date].country.died;
    return obj;
  }, { acc: {}, cumcon: 0, cumrec: 0, cumded: 0 });

  const cdata = curcdata.acc;

  cdata[today] = {
    total: (curcdata.cumcon < latestdata.country.cumcon) ? latestdata.country.total : 0,
    recovered: (curcdata.cumrec < latestdata.country.cumrec) ? latestdata.country.recovered : 0,
    died: (curcdata.cumded < latestdata.country.cumded) ? latestdata.country.died : 0,
  };

  return { sdata, cdata, before: today };
}

const fetch = url => new Promise((resolve, reject) => https.get(url, res => {
	let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    data = JSON.parse(data);
    return resolve(data);
  });
}));

let dump = {};
const dailyDataPromise = fetch(dailydataurl).then(x => dump.dailydata = x);
const latestDataPromise = fetch(latestdataurl).then(x => dump.latestdata = x.statewise);

function merge (d1, d2) {
  let obj = {...d1, before: today};
  for (let state of Object.keys(d2.sdata)) {
    obj.sdata[state] = Object.keys(d2.sdata[state]).reduce((acc, date) => {
      acc[date] = d2.sdata[state][date];
      return acc;
    }, obj.sdata[state] || {});
  }
  for (let date of Object.keys(d2.cdata)) {
   obj.cdata[date] = d2.cdata[date];
  }
  return obj;
}

Promise.all([dailyDataPromise, latestDataPromise ]).then(_ => {
	let data = merge(oldData, getData(dump.dailydata, dump.latestdata));
  fs.writeFileSync('./data.json', JSON.stringify(data, null, 2), 'utf8');
  fs.writeFileSync('./compressed.json', JSON.stringify(data), 'utf8');
});
