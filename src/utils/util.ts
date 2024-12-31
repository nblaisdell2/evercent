import { v4 } from "uuid";
export const generateUUID = v4;
import { writeFile } from "fs";
import { formatInTimeZone, getTimezoneOffset } from "date-fns-tz";

export const roundNumber = (num: number, decimals: number = 0) => {
  const mul = Math.pow(10, decimals);
  return Math.round(Number(num) * mul) / mul;
};

export const sum = <T>(list: T[], prop: keyof T, start: number = 0): number => {
  return list.reduce((prev, curr) => prev + (curr[prop] as number), start);
};

export const find = <T>(
  list: T[],
  predicate: (value: T, index: number, obj: T[]) => unknown,
  thisArg?: any
): T => {
  return list.filter(predicate)[0];
};

export const writeDataToFile = (
  filename: string,
  data: any,
  cb: () => void
) => {
  writeFile(__dirname + "/" + filename, JSON.stringify(data), "utf-8", cb);
};

export const getDistinctValues = <T, V extends keyof T>(
  values: T[],
  key: V
): T[V][] => {
  let distinctValues: T[V][] = [];
  for (let i = 0; i < values.length; i++) {
    const val = values[i][key];
    if (!distinctValues.includes(val)) {
      distinctValues.push(val);
    }
  }
  return distinctValues;
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const getUTCString = (parsedTime: string | number | Date) => {
  return formatInTimeZone(parsedTime, "UTC", "yyyy-MM-dd HH:mm:ss");
};

export const getStartOfDay = (strDate?: string) => {
  const now = strDate ? new Date(strDate) : new Date();
  const startOfDayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return startOfDayUTC;
};

export const getTZAdjustedDate = (dt: Date, timezone: string = "Etc/Utc") => {
  const utcDate = new Date(
    Date.UTC(
      dt.getUTCFullYear(),
      dt.getUTCMonth(),
      dt.getUTCDate(),
      dt.getUTCHours(),
      dt.getUTCMinutes(),
      dt.getUTCSeconds(),
      -getTimezoneOffset(timezone)
    )
  );

  return utcDate;
};

export const getTimezoneAdjustedDate = (
  strDate?: string,
  timezone: string = "Etc/Utc"
) => {
  const date = strDate ? new Date(strDate) : new Date();

  const utcDate = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      -getTimezoneOffset(timezone)
    )
  );

  return utcDate;
};
