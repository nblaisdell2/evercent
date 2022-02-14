import Axios from "axios";

// DATES
export function treatAsUTC(date) {
  var result = new Date(date);
  result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
  return result;
}

export function daysBetween(startDate, endDate) {
  var millisecondsPerDay = 24 * 60 * 60 * 1000;
  return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
}

export function getShortDate(dt) {
  let newDate = dt;

  return (
    ("0" + (newDate.getMonth() + 1)).slice(-2) +
    "/" +
    ("0" + newDate.getDate()).slice(-2) +
    "/" +
    newDate.getFullYear()
  );
}

// STRING FUNCTIONS
export function getMoneyString(num, numDecimals = 0) {
  return "$" + num.toFixed(numDecimals);
}

// OTHER
export function merge(obj, fieldName) {
  let subArrays = obj.map((x) => x[fieldName]);
  return subArrays.reduce((a, b) => {
    return a.concat(b);
  }, []);
}

export function updateObjectFields(obj, newVals) {
  // console.log("=====================");
  // console.log("in updateObjectFields");
  let newObj = { ...obj };
  // console.log("newObj = ", newObj);
  let keys = Object.keys(newVals);
  // console.log("keys = ", keys);
  for (let i = 0; i < keys.length; i++) {
    // console.log("What is newObj[keys[i]]? " + newObj[keys[i]]);
    if (newObj[keys[i]] !== null && newObj[keys[i]] !== undefined) {
      // console.log("Setting newObj: " + keys[i] + " = " + newVals[keys[i]]);
      newObj[keys[i]] = newVals[keys[i]];
    }
  }
  // console.log("=====================");

  return newObj;
}

export function updateObjectField(obj, fieldNameIn, newFieldVal) {
  let newFields = {};
  newFields[fieldNameIn] = newFieldVal;

  return updateObjectFields(obj, newFields);
}

export function getDefaultNumber(val, defaultVal = 0) {
  if (val == null || val == undefined || val == "") {
    val == null;
  }

  return !val ? defaultVal : parseInt(val);
}

export async function getAPIData(endpoint, params) {
  console.log("getAPIData - endpointIn");
  try {
    const baseURL = process.env.DB_API_HOST;
    const sp_name = endpoint;

    console.log("spName = ", sp_name);
    const apiParams = {
      spName: sp_name,
      ...params,
    };
    console.log("URL (GET): " + baseURL + "get_user_details");
    console.log(apiParams);
    const resp = await Axios({
      method: "GET",
      url: baseURL + "get_user_details",
      data: apiParams,
    });

    let newData = await resp.data["data"];
    return newData;
  } catch (err) {
    console.log("error in getAPIData");
    console.log(err);
  }

  return null;
}

export async function getAPIDataClient(endpoint, params) {
  return await Axios.get("/api/db/get_evercent_data", {
    params: {
      endpoint: endpoint,
      ...params,
    },
  });
}

export async function postAPIDataClient(endpoint, params) {
  console.log("postAPIDataClient - endpointIn");
  console.log(endpoint);

  return await Axios.post("/api/db/post_evercent_data", {
    params: {
      endpoint: endpoint,
      ...params,
    },
  });
}
