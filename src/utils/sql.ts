import { log } from "./log";
import {
  config,
  connect,
  Connection,
  ConnectionPool,
  IProcedureResult,
} from "mssql";

let CONFIG: config = { server: "" };

// Callback function when connecting to SQL Server
const onBeforeConnect = (conn: Connection) => {
  conn.once("connect", (err) => {
    // err ? console.error(err) : console.log("mssql connected");
  });
  conn.once("end", (err) => {
    // err ? console.error(err) : console.log("mssql disconnected");
  });
};

// Gets the 'mssql' configuration for connecting to our database
// Caches the config so only assembled once
const getConfig = (): config => {
  if (!CONFIG.server) {
    CONFIG = {
      user: process.env.DB_USER,
      password: process.env.DB_PWD,
      database: process.env.DB_NAME,
      server: process.env.DB_HOST as string,
      // port: 1433, // default to 1433
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      options: {
        encrypt: false, // for azure
        trustServerCertificate: true, // change to true for local dev / self-signed certs
        useUTC: true, // default = true
        trustedConnection: false, // default = false (Windows Authentication)
      },
      beforeConnect: onBeforeConnect,
      arrayRowMode: false, // default = false (provides column data)
      parseJSON: false, // default = false (parses JSON recordsets to JS objects)
    };
  }

  return CONFIG;
};

// Creates a single instance of a ConnectionPool, which can be shared
// with our other queries, instead of relying on the global pool
export async function createSharedConnectionPool(): Promise<ConnectionPool> {
  const appPool = new ConnectionPool(getConfig());
  return await appPool.connect();
}

// If the shared connection pool is available, use it.
// Otherwise, use the global connection pool
async function getConnectionPool(): Promise<ConnectionPool> {
  return await connect(getConfig());
  // if (req?.app?.locals?.db) {
  //   // console.log("Getting connection from SHARED pool");
  //   return await req.app.locals.db.connect(getConfig());
  // } else {
  //   // console.log("Getting connection from GLOBAL pool");
  //   return await connect(getConfig());
  // }
}

export type QueryParams = {
  name: string;
  value: any;
};

export type QueryResponse = {
  error: string | null;
  resultCount: number;
  resultData: any[] | any;
};

// Creates the QueryResponse object based on the results
// returned from a stored procedure
function getQueryResponse(
  res: IProcedureResult<any> | string,
  returnData: boolean
) {
  let queryResponse: QueryResponse = {
    error: null,
    resultCount: 0,
    resultData: null,
  };

  if (typeof res === "string") {
    queryResponse.error = res;
    return queryResponse;
  }

  queryResponse.resultData = { result: "Query ran successfully!" };
  // log("sql data", res);

  if (returnData) {
    queryResponse.resultCount = res.recordsets.length as number;
    // log("result count", queryResponse.resultCount);

    if (queryResponse.resultCount > 1) {
      // "multiple results";
      // log("MULTIPLE RESULTS");
      queryResponse.resultData = res.recordsets as any[];
    } else {
      if (!res.recordset || res.recordset.length == 0) {
        queryResponse.resultData = null;
      } else {
        let resKeys: string[] = Object.keys(res.recordset[0]);
        if (res.recordset.length > 1) {
          // single result - multiple rows
          // log("SINGLE RESULT - MULTIPLE ROWS");
          queryResponse.resultData = res.recordset;
        } else if (resKeys.length > 1) {
          // "single result - single row";
          // log("SINGLE RESULT - SINGLE ROW");
          queryResponse.resultData = res.recordset[0];
        } else {
          // "scalar";
          // log("SCALAR VALUE", { resKeys });
          queryResponse.resultData = res.recordset[0][resKeys[0]];
        }
      }
    }
  }

  return queryResponse;
}

// Executes a stored procedure after assembling its parameters,
// and returns the results from the stored procedure
async function getSQLServerResponse(
  spName: string,
  params: QueryParams[]
): Promise<IProcedureResult<any> | string> {
  log("Running SQL Query: '" + spName + "'");

  let pool = await getConnectionPool();
  let sqlReq = pool.request();
  for (let i = 0; i < params.length; i++) {
    sqlReq.input(params[i].name, params[i].value);
  }
  try {
    const sqlRes = await sqlReq.execute(spName);

    return sqlRes;
  } catch (error: any) {
    log(error);
    if (error?.code == "ETIMEOUT") {
      return "Query Timed Out!";
    }

    // If there are multiple errors, just show me the first one
    if (error?.precedingErrors && error.precedingErrors.length > 0) {
      error = error.precedingErrors[0];
    }

    const errMsg = error?.originalError.info.message;
    return errMsg;
  }
}

// Execute a stored procedure, with no return value
export async function execute(
  spName: string,
  params: QueryParams[]
): Promise<QueryResponse> {
  const res = await getSQLServerResponse(spName, params);
  return getQueryResponse(res, false);
}

// Execute a stored procedure, and retreive the
// results from the stored procedure
export async function query(
  spName: string,
  params: QueryParams[]
): Promise<QueryResponse> {
  const res = await getSQLServerResponse(spName, params);
  return getQueryResponse(res, true);
}

export const sqlErr = (val: QueryResponse) => {
  return !!val.error;
};
