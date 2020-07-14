const https = require('https');
const fs = require('fs');

const rawdata = JSON.parse(fs.readFileSync('./data.json'));

const now = new Date();
//now.setDate(now.getDate()+1);
const today = dateFormat(now);
const yd = new Date();
yd.setDate(now.getDate()-1);
const yday = dateFormat(yd);

const population = {
  "Uttar Pradesh": 199812341,
  "Maharashtra": 112374333,
  "Bihar": 104099452,
  "West Bengal": 91276115,
  "Madhya Pradesh": 72626809,
  "Tamil Nadu": 72147030,
  "Rajasthan": 68548437,
  "Karnataka": 61095297,
  "Gujarat": 60439692,
  "Andhra Pradesh": 49577103,
  "Odisha": 41974218,
  "Telangana": 35003674,
  "Kerala": 33406061,
  "Jharkhand": 32988134,
  "Assam": 31205576,
  "Punjab": 27743338,
  "Chhattisgarh": 25545198,
  "Haryana": 25351462,
  "Uttarakhand": 10086292,
  "Himachal Pradesh": 6864602,
  "Tripura": 3673917,
  "Meghalaya": 2966889,
  "Manipur": 2570390,
  "Nagaland": 1978502,
  "Goa": 1458545,
  "Arunachal Pradesh": 1383727,
  "Mizoram": 1097206,
  "Sikkim": 610577,
  "Delhi": 16787941,
  "Jammu and Kashmir": 12267032,
  "Puducherry": 1247953,
  "Chandigarh": 1055450,
  "Dadra and Nagar Haveli": 585764,
  "Andaman and Nicobar Islands": 380581,
  "Ladakh": 274000,
  "Lakshadweep": 64473,
  "India": 1210569573,
  "country": 1210569573
};

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

function groupBy (source, key, cond=pass) {
  return source.reduce((acc, p) => {
    if (p[key] && cond(p[key])) {
      if (!acc[p[key]]) acc[p[key]] = [];
      acc[p[key]].push(p);
    }
    return acc;
  }, {});
}

function select (source, keys) {
  return source.map(x => Object.keys(x).reduce((acc, key) => {
    if (keys.includes(key)) acc[key] = x[key];
    return acc;
  }, {}));
}

function mapValues (source, mapper) {
  return Object.keys(source).reduce((acc, key) => {
    acc[key] = mapper(source[key], key);
    return acc;
  }, {});
}

function twodig (x) {
  if (x.toString().length === 1) return '0'+x.toString();
  return x.toString();
}

function dateFormat (d) {
  return `${twodig(d.getDate())}/${twodig(d.getMonth()+1)}/${d.getFullYear()}`;
}

function onlyPositive (x) {
  return x < 0 ? 0 : x;
}

function getDates () {
  let cur = new Date('Jan 30 2020');
  let arr = [];
  while (cur < now) {
    arr.push(dateFormat(cur));
    cur.setDate(cur.getDate()+1);
  }
  return arr;
}

// DATA PROCESSING

function processData({sdata, cdata}) {
  let dates = getDates();
  let states = Object.keys(sdata);

  let data = dates.reduce((acc, date, ind) => {
    let prev = {
      country: {
        total: 0,
        recovered: 0,
        died: 0,
      },
      ...states.reduce((acc, state) => {
        acc[state] = {
          total: 0,
          recovered: 0,
          died: 0,
        };
        return acc;
      }, {})
    };
    if (ind > 0) prev = acc[dates[ind-1]];
    let obj = {};
    obj.country = {};
    obj.country.new = cdata[date] ? cdata[date].total : 0;
    obj.country.total = prev.country.total + obj.country.new;

    obj.country.newRecovered = cdata[date] ? cdata[date].recovered : 0;
    obj.country.recovered = obj.country.newRecovered + prev.country.recovered;
    obj.country.newDied = cdata[date] ? cdata[date].died : 0;
    obj.country.died = obj.country.newDied + prev.country.died;

    for(let state of states) {
      obj[state] = {};
      obj[state].new = sdata[state][date] ? sdata[state][date].total : 0;
      obj[state].total = prev[state].total + obj[state].new;

      obj[state].newRecovered = sdata[state][date] ? sdata[state][date].recovered : 0;
      obj[state].recovered = obj[state].newRecovered + prev[state].recovered;
      obj[state].newDied = sdata[state][date] ? sdata[state][date].died : 0;
      obj[state].died = obj[state].newDied + prev[state].died;
    }
    acc[date] = obj;
    return acc;
  }, {});

  for (let date of dates) {
    if(data[date].country.total === 0) delete data[date];
  }

  const fns = [...states, 'country'].reduce((acc, state) => {
    acc[state] = curveFit(data, state);
    return acc;
  }, {});

	return fns;
}


function curveFit (data, state) {
  const dates = Object.keys(data);
  let d0 = 0;
  let rd0 = 0;
  let dd0 = 0;

  let currentTotal = data[yday][state].total;
  let p0limit = currentTotal * 0.1;

  let currentRecovered = data[yday][state].recovered;
  let r0limit = currentRecovered * 0.1;

  let currentDead = data[yday][state].died;
  let d0limit = currentDead * 0.1;

  const relative = currentTotal > 1000;

  for (let i=0; i<dates.length; i++) {
    if (!d0 && data[dates[i]][state].total > p0limit) {
      d0 = i;
    }
    if (!rd0 && data[dates[i]][state].recovered > r0limit) {
      rd0 = i;
    }
    if (!dd0 && data[dates[i]][state].died > d0limit) {
      dd0 = i;
    }
  }

  const dset = dates.slice(d0, -1).map((dt, ind) => ({
    x: ind,
    y: data[dt][state].total,
  }));

  const rdset = dates.slice(rd0, -1).map((dt, ind) => ({
    x: ind,
    y: data[dt][state].recovered,
  }));

  const ddset = dates.slice(dd0, -1).map((dt, ind) => ({
    x: ind,
    y: data[dt][state].died,
  }));

  if (!dset.length) {
    return null;
  }

  const P0 = dset[0].y;
  const RP0 = rdset[0].y;
  const DP0 = ddset[0].y;

	return { P0, dset, relative, RP0, rdset, DP0, ddset };
}

let data = processData(rawdata);
console.log(Object.keys(data).filter(state => data[state].P0).length);
for (let state of Object.keys(data)) {
  if (!data[state].P0) continue;
  console.log(state);
  console.log(data[state].P0, population[state], data[state].dset.length, data[state].relative ? 1 : 0);
  for (let {x, y} of data[state].dset) console.log(x, y);
  console.log(data[state].DP0, data[state].ddset.length);
  for (let {x, y} of data[state].ddset) console.log(x, y);
  console.log(data[state].RP0, data[state].rdset.length);
  for (let {x, y} of data[state].rdset) console.log(x, y);
}
