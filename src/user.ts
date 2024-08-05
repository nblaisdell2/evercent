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

export const createUserData = (userData: any): UserData => {
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
