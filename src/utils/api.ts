import axios, {
  AxiosHeaders,
  AxiosResponseHeaders,
  Method,
  ResponseType,
} from "axios";
import { log } from "./log";

type APIRequest = {
  method: Method;
  url: string;
  params?: any;
  headers?: any;
  responseType?: ResponseType;
};

type APIResponse = {
  data: any;
  headers: AxiosResponseHeaders;
  error: string | null;
};

// Global Axios config used for every request
const instance = axios.create({
  timeout: 30000, // 30 sec timeout
  responseType: "json",
});

function getAxiosError(err: any): APIResponse {
  const errCodeMsg = err?.code;
  const errStatusCode = err?.response?.status || "Unknown Status";
  const errStatusText = err?.response?.statusText;
  const resHeaders = err?.response?.headers;

  let errText = errStatusText;
  if (err?.response?.data?.error) {
    errText +=
      typeof err.response.data.error === "object"
        ? " // " + err.response.data.error?.detail
        : " // " + err.response.data.error;
  }

  const errMsg = `AxiosError (${errStatusCode} - ${errCodeMsg}) :: ${errText}`;
  throw new Error(errMsg);
}

export async function getAPIResponse({
  method,
  url,
  params,
  headers,
  responseType,
}: APIRequest): Promise<APIResponse> {
  if (!responseType) responseType = "json";
  if (!params) params = {};
  if (!headers) headers = {};
  headers = AxiosHeaders.from(headers);

  log("API Running:", method, url);

  // return { data: "", error: "", headers: {} as AxiosResponseHeaders };
  return instance({
    url,
    method,
    responseType,
    params,
    headers,
  })
    .then((response) => {
      return {
        data: response.data,
        headers: response.headers as AxiosResponseHeaders,
        error: null,
      };
    })
    .catch(getAxiosError);
}
