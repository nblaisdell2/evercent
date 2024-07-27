import { log } from "./utils/log";
import { execute, query, sqlErr } from "./utils/sql";
import { addMonths, addWeeks } from "date-fns";

export type PayFrequency = "Weekly" | "Every 2 Weeks" | "Monthly";

export type UserData = {
  userID: string;
  budgetID: string;
  username: string;
  monthlyIncome: number;
  payFrequency: PayFrequency;
  nextPaydate: string;
  monthsAheadTarget: number;
};

const createUserData = (userData: any): UserData => {
  return {
    userID: userData.UserID,
    budgetID: userData.DefaultBudgetID,
    username: userData.UserName,
    monthlyIncome: userData.MonthlyIncome,
    payFrequency: userData.PayFrequency,
    nextPaydate: userData.NextPaydate,
    monthsAheadTarget: userData.MonthsAheadTarget,
  };
};

export const getAmountByPayFrequency = (
  amount: number,
  payFreq: PayFrequency
): number => {
  switch (payFreq) {
    case "Weekly":
      return amount / 4;
    case "Every 2 Weeks":
      return amount / 2;
    case "Monthly":
      return amount;
    default:
      return -1;
  }
};

export const incrementDateByFrequency = (
  dt: Date,
  payFreq: PayFrequency
): Date => {
  switch (payFreq) {
    case "Weekly":
      return addWeeks(dt, 1);
    case "Every 2 Weeks":
      return addWeeks(dt, 2);
    case "Monthly":
      return addMonths(dt, 1);
    default:
      return dt;
  }
};

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////

export const getUserData = async (
  userEmail: string
): Promise<UserData | null> => {
  log("Getting user details for email: '" + userEmail + "'");

  const queryRes = await query("spEV_GetUserData", [
    { name: "UserEmail", value: userEmail },
  ]);
  if (sqlErr(queryRes)) return null;

  return createUserData(queryRes.resultData);
};

export const updateUserDetails = async function (
  userID: string,
  budgetID: string,
  monthlyIncome: number,
  payFrequency: PayFrequency,
  nextPaydate: string
): Promise<UserData | null> {
  const queryRes = await execute("spEV_UpdateUserDetails", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budgetID },
    { name: "MonthlyIncome", value: monthlyIncome },
    { name: "PayFrequency", value: payFrequency },
    { name: "NextPaydate", value: nextPaydate },
  ]);
  if (sqlErr(queryRes)) return null;
  return queryRes.resultData as UserData;
};

// export const updateCategoryDetails = async function () {
//   const { UserID, BudgetID, Details } = req.body;

//   const queryRes = await execute("spEV_UpdateCategoryDetails", [
//     { name: "UserID", value: UserID },
//     { name: "BudgetID", value: BudgetID },
//     { name: "Details", value: Details },
//   ]);
//   if (sqlErr(queryRes)) return;

//   // next({
//   //   data: queryRes.resultData,
//   //   message: "Categories Updated Successfully",
//   // });
// };

export const updateMonthsAheadTarget = async function (
  userID: string,
  budgetID: string,
  newTarget: number
): Promise<number> {
  return execute("spEV_UpdateUserMonthsAheadTarget", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budgetID },
    { name: "NewTarget", value: newTarget },
  ])
    .then((queryRes) => {
      return queryRes.resultData as number;
    })
    .catch((err) => -1);

  // const queryRes = await execute("spEV_UpdateUserMonthsAheadTarget", [
  //   { name: "UserID", value: userID },
  //   { name: "BudgetID", value: budgetID },
  //   { name: "NewTarget", value: newTarget },
  // ]);
  // if (sqlErr(queryRes)) throw new Error(queryRes.error as string);
  // return queryRes.resultData as number;
};
