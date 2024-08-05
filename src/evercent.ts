import { AutoRun } from "./autoRun";
import { Budget } from "./budget";
import { CategoryGroup, ExcludedCategory } from "./category";
import { UserData } from "./user";

export type EvercentData = {
  userData: UserData | null;
  budget: Budget | null;
  categoryGroups: CategoryGroup[];
  excludedCategories: ExcludedCategory[];
  autoRuns: AutoRun[];
  pastRuns: AutoRun[];
};

export type EvercentResponse<T> = {
  data: T | null;
  message: string | undefined | null;
  err: string | undefined | null;
};

export const getResponseError = <T>(
  err?: string | undefined | null
): EvercentResponse<T> => {
  return {
    data: null,
    message: err,
    err,
  };
};

export const getResponse = <T>(
  data: T,
  message?: string | undefined | null
): EvercentResponse<T> => {
  return {
    data,
    message,
    err: null,
  };
};
