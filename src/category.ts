import {
  addMonths,
  differenceInMonths,
  isEqual,
  parseISO,
  startOfMonth,
} from "date-fns";
import { log } from "./utils/log";
import { execute, query, sqlErr } from "./utils/sql";
import { find, roundNumber, sum } from "./utils/util";
import { PayFrequency, getAmountByPayFrequency } from "./user";
import {
  Budget,
  BudgetMonth,
  BudgetMonthCategory,
  BudgetMonthCategoryGroup,
  getBudgetCategories,
  getBudgetCategory,
  getBudgetCategoryForMonth,
  getBudgetMonth,
} from "./budget";

// TODO: Can I extract this into its own generic type
//       when querying the database?
type CategoryDataDB = {
  BudgetID: string;
  CategoryGUID: string;
  CategoryGroupID: string;
  CategoryID: string;
  CategoryAmount: number;
  ExtraAmount: number;
  IsRegularExpense: boolean;
  IsUpcomingExpense: boolean;
  IsMonthly: boolean;
  NextDueDate: string;
  ExpenseMonthsDivisor: number;
  RepeatFreqNum: number;
  RepeatFreqType: string;
  IncludeOnChart: boolean;
  MultipleTransactions: boolean;
  TotalExpenseAmount: number;
};

type CategoryAmounts = {
  amount: number;
  extraAmount: number;
  adjustedAmount: number;
  adjustedAmountPlusExtra: number;
};

export type CategoryGroup = {
  groupID: string;
  groupName: string;
  categories: Category[];
} & CategoryAmounts;

export type Category = {
  guid: string;
  categoryGroupID: string;
  categoryID: string;
  groupName: string;
  name: string;
  monthsAhead: number;
  postingMonths: PostingMonth[];
  regularExpenseDetails: RegularExpenses | null;
  upcomingDetails: UpcomingExpenses | null;
} & CategoryAmounts;

export type PostingMonth = {
  month: string;
  amount: number;
  percent: number;
};

export type ExcludedCategory = Pick<
  Category,
  "guid" | "categoryGroupID" | "categoryID"
>;

export type RegularExpenses = {
  guid: string;
  isMonthly: boolean;
  nextDueDate: string;
  monthsDivisor: number;
  repeatFreqNum: number;
  repeatFreqType: string;
  includeOnChart: boolean;
  multipleTransactions: boolean;
};

export type UpcomingExpenses = {
  guid: string;
  expenseAmount: number;
};

// export type UpcomingExpenseDetails = {
//   guid: string;
//   categoryName: string;
//   amountSaved: number;
//   totalAmount: number;
//   purchaseDate: string;
//   daysAway: number;
//   paychecksAway: number;
// };

const createCategoryGroupList = (
  categoryDataDB: CategoryDataDB[],
  budget: Budget,
  payFreq: PayFrequency,
  nextPaydate: string
): CategoryGroup[] => {
  const budgetCategoryGroups = budget.months[0].groups;
  return (
    budgetCategoryGroups
      // remove hidden/deleted category groups when generating the Evercent category list
      .filter((bg) => !bg.hidden && !bg.deleted)
      .map((grp) => {
        const newCategories = createCategoryList(
          grp,
          categoryDataDB,
          budget.months,
          payFreq,
          nextPaydate
        );

        return {
          groupID: grp.categoryGroupID.toUpperCase(),
          groupName: grp.categoryGroupName,
          amount: sum(newCategories, "amount"),
          extraAmount: sum(newCategories, "extraAmount"),
          adjustedAmount: sum(newCategories, "adjustedAmount"),
          adjustedAmountPlusExtra: sum(
            newCategories,
            "adjustedAmountPlusExtra"
          ),
          categories: newCategories,
        } as CategoryGroup;
      })
  );
};

const createCategoryList = (
  group: BudgetMonthCategoryGroup,
  categoryDataDB: CategoryDataDB[],
  months: BudgetMonth[],
  payFreq: PayFrequency,
  nextPaydate: string
): Category[] => {
  return (
    group.categories
      // remove hidden/deleted categories when generating the Evercent category list
      .filter((c) => !c.hidden && !c.deleted)
      .map((cat) => {
        const currCatDB = find(categoryDataDB, (c) => sameCategory(c, cat));
        return createCategory(currCatDB, cat, months, payFreq, nextPaydate);
      })
  );
};

const createCategory = (
  dbCat: CategoryDataDB,
  budgetCategory: BudgetMonthCategory,
  months: BudgetMonth[],
  payFreq: PayFrequency,
  nextPaydate: string
): Category => {
  const category: Category = {
    guid: dbCat.CategoryGUID,
    categoryGroupID: dbCat.CategoryGroupID,
    categoryID: dbCat.CategoryID,
    groupName: budgetCategory.categoryGroupName,
    name: budgetCategory.name,
    amount: dbCat.CategoryAmount,
    extraAmount: dbCat.ExtraAmount,
    adjustedAmount: 0,
    adjustedAmountPlusExtra: 0,
    regularExpenseDetails: getRegularExpenses(dbCat),
    upcomingDetails: getUpcomingExpenses(dbCat),
    monthsAhead: 0,
    postingMonths: [],
  };
  const adjAmount = calculateAdjustedAmount(category, months, false);
  category.adjustedAmount = adjAmount;
  category.adjustedAmountPlusExtra = adjAmount + category.extraAmount;

  const postingMonths = getPostingMonths(
    category,
    months,
    payFreq,
    nextPaydate
  );
  const monthsAhead = calculateMonthsAhead(
    category,
    months,
    payFreq,
    nextPaydate
  );

  return {
    ...category,
    monthsAhead: monthsAhead,
    postingMonths: postingMonths,
  };
};

const getRegularExpenses = (dbCat: CategoryDataDB): RegularExpenses | null => {
  if (dbCat.IsMonthly == null) return null;
  return {
    guid: dbCat.CategoryGUID,
    isMonthly: dbCat.IsMonthly,
    nextDueDate: dbCat.NextDueDate,
    monthsDivisor: dbCat.ExpenseMonthsDivisor,
    repeatFreqNum: dbCat.RepeatFreqNum,
    repeatFreqType: dbCat.RepeatFreqType,
    includeOnChart: dbCat.IncludeOnChart,
    multipleTransactions: dbCat.MultipleTransactions,
  };
};

const getUpcomingExpenses = (
  dbCat: CategoryDataDB
): UpcomingExpenses | null => {
  if (dbCat.TotalExpenseAmount == null) return null;
  return {
    guid: dbCat.CategoryGUID,
    expenseAmount: dbCat.TotalExpenseAmount,
  };
};

const getExcludedCategories = (dbData: any): ExcludedCategory[] => {
  return dbData.map((d: any) => {
    return {
      guid: d.CategoryGUID,
      categoryGroupID: d.CategoryGroupID,
      categoryID: d.CategoryID,
    } as ExcludedCategory;
  });
};

const sameCategory = (
  dbCat: CategoryDataDB,
  budgetCat: BudgetMonthCategory
) => {
  return (
    dbCat.CategoryGroupID.toLowerCase() ==
      budgetCat.categoryGroupID.toLowerCase() &&
    dbCat.CategoryID.toLowerCase() == budgetCat.categoryID.toLowerCase()
  );
};

// ---------------------------------------------------------
// ---------------------------------------------------------

const calculateAdjustedAmount = (
  category: Category,
  months: BudgetMonth[],
  recalculate: boolean
): number => {
  // If it's not a regular expense, or if it is a regular expense,
  // and it's a monthly expense, simply return the user's entered category amount
  if (
    !category.regularExpenseDetails ||
    category.regularExpenseDetails.isMonthly
  ) {
    return category.amount;
  }

  // If we've excluded it from the chart, just return 0 here
  if (!category.regularExpenseDetails.includeOnChart) {
    return 0;
  }

  let numMonths = 0;
  if (!recalculate) {
    numMonths = category.regularExpenseDetails.monthsDivisor;
  } else {
    // Get BudgetMonthCategory from the same month of
    // this category's next due date
    log("calculating adjusted amount");
    const budgetMonth = getBudgetMonth(
      months,
      parseISO(category.regularExpenseDetails.nextDueDate)
    );
    const budgetCategory = getBudgetCategory(
      budgetMonth,
      category.categoryGroupID,
      category.categoryID
    );

    if (budgetCategory.available >= category.amount) {
      numMonths = getNumberOfMonthsByFrequency(category.regularExpenseDetails);
    } else {
      // Calculate the # of months between today and the
      // category's next due date
      const dtThisMonth = startOfMonth(new Date());
      const dtDueDate = startOfMonth(
        parseISO(category.regularExpenseDetails.nextDueDate)
      );
      numMonths = differenceInMonths(dtDueDate, dtThisMonth) + 1;
    }
  }

  if (numMonths == 0) return category.amount;

  const catAmtDivided = category.amount / numMonths;

  const catAmtByFreq = getAmountByFrequency(
    category.amount,
    category.regularExpenseDetails
  );

  // When we have fewer months than expected to pay something off, we'll
  // need to pay more per month, which is accounted for in the "catAmtDivided > catAmtByFreq"
  // statement. However, when we have many months ahead to pay it off, and the amount
  // would be much lower than expected per month, we'll still pay off the amount by
  // frequency, instead of that much lower amount, which can be difficult to keep
  // track of.
  let finalAdjAmt = 0;
  if (catAmtDivided > catAmtByFreq) {
    finalAdjAmt = catAmtDivided;
  } else {
    finalAdjAmt = catAmtByFreq;
  }

  if (!Number.isInteger(finalAdjAmt)) {
    log("NOT A WHOLE NUMBER", finalAdjAmt);
    finalAdjAmt += 0.01;
  } else {
    log("IS A WHOLE NUMBER", finalAdjAmt);
  }

  return finalAdjAmt;
};

const getNumberOfMonthsByFrequency = (
  regularExpenseDetails: RegularExpenses
): number => {
  return (
    regularExpenseDetails.repeatFreqNum *
    (regularExpenseDetails.repeatFreqType == "Months" ? 1 : 12)
  );
};

const getAmountByFrequency = (
  amount: number,
  regularExpenseDetails: RegularExpenses
) => {
  const numMonths = getNumberOfMonthsByFrequency(regularExpenseDetails);
  return amount / numMonths;
};

export const getPostingMonths = (
  category: Category,
  months: BudgetMonth[],
  payFreq: PayFrequency,
  nextPaydate: string,
  overrideNum?: number | undefined
): PostingMonth[] => {
  const DEBUG = category.name == "YNAB";

  if (DEBUG) log("category", { category, payFreq, nextPaydate });

  let postingMonths: PostingMonth[] = [];
  const useOverride = overrideNum != undefined;

  let totalAmt = roundNumber(
    getAmountByPayFrequency(category.adjustedAmountPlusExtra, payFreq),
    2
  );
  let totalDesired = roundNumber(category.adjustedAmount, 2);

  let currMonth = parseISO(nextPaydate);

  if (DEBUG) log("amounts", { totalAmt, totalDesired, currMonth });

  // Keep finding months until
  //  1. We run out of money (totalAmt)
  //  2. We override the # of months, and haven't reached that
  //     # of months yet
  while (
    (!useOverride && totalAmt > 0) ||
    (useOverride && postingMonths.length < overrideNum)
  ) {
    // if (DEBUG) log("getting budget month", { currMonth });
    // log("getPostingMonths");
    const bm = getBudgetMonth(months, currMonth);
    if (!bm) {
      // if (DEBUG) log("Gotta leave!");
      return postingMonths;
    }

    // log("checking month", {
    //   ynabMonth: bm.month,
    //   parsed: parseISO(bm.month).toISOString(),
    // });
    const bc = getBudgetCategory(
      bm,
      category.categoryGroupID,
      category.categoryID
    );

    let desiredPostAmt = -1;
    if (!useOverride) {
      // Get YNAB category "budgeted" amount
      // (use 0 if negative)
      if (bc.budgeted < totalDesired) {
        desiredPostAmt = totalDesired - (bc.budgeted < 0 ? 0 : bc.budgeted);
      }
    } else {
      desiredPostAmt = totalDesired;
    }

    if (DEBUG) log("desiredPostAmt", { desiredPostAmt });

    if (
      isEqual(parseISO(bm.month), startOfMonth(new Date())) &&
      ((!category.regularExpenseDetails?.multipleTransactions &&
        bc.activity < 0) ||
        (useOverride ? 0 : bc.available) >= desiredPostAmt)
    ) {
      currMonth = addMonths(currMonth, 1);
      continue;
    }

    if (desiredPostAmt !== -1) {
      const postAmt = useOverride
        ? desiredPostAmt
        : Math.min(totalAmt, desiredPostAmt);

      // When we have a bit left over, due to floating-point numbers,
      // but not enough for even 1 cent (so less than 0.01), we'll stop
      // adding months, since we've essentially run out
      if (roundNumber(postAmt, 2) <= 0) {
        currMonth = addMonths(currMonth, 1);
        continue;
      }

      // const month = zonedTimeToUtc(
      //   parse(bm.month, "yyyy-MM-dd", new Date()),
      //   "UTC"
      // ).toISOString();
      const month = parseISO(bm.month).toISOString();
      postingMonths.push({
        month: month,
        amount: roundNumber(postAmt, 2),
        percent: 0,
      });
      if (DEBUG)
        log("Added month", {
          month: month,
          amount: roundNumber(postAmt, 2),
          percent: 0,
        });

      totalAmt -= roundNumber(postAmt, 2);

      // recalculate totalDesired using repeat frequency here
      // because of non-monthly regular expense && due date month is currMonth
      // && ynab available == category.amount
      if (
        dueDateAndAmountSet(
          category.regularExpenseDetails?.isMonthly,
          category.regularExpenseDetails?.nextDueDate,
          category.amount,
          bc,
          currMonth
        )
      ) {
        if (DEBUG)
          log(
            "Recalculating totalDesired due to due date being met for category!"
          );
        totalDesired = calculateAdjustedAmount(category, months, true);
      }
    }

    // if (DEBUG) log("ADVANCING TO NEXT MONTH");
    currMonth = addMonths(currMonth, 1);
  }

  return postingMonths;
};

const calculateMonthsAhead = (
  category: Category,
  months: BudgetMonth[],
  payFreq: PayFrequency,
  nextPaydate: string
): number => {
  const DEBUG = category.name == "YNAB";
  if (category.adjustedAmountPlusExtra == 0) return 0;

  let monthsAhead = 0;
  let postingMonths = getPostingMonths(
    category,
    months,
    payFreq,
    nextPaydate,
    120
  );

  // We don't consider the current month when referencing our "months ahead"
  // number, so remove the current month if it's there
  if (isEqual(parseISO(postingMonths[0].month), startOfMonth(new Date()))) {
    postingMonths.shift();
  }

  if (DEBUG) log("Got posting months for YNAB", postingMonths);

  // Loop through each posting month and determine if we've already budgeted
  // the expected amount in our actual budget. If so, increment the monthsAhead
  // value and continue to the next month until either all months are exhausted,
  // or we find a month where we haven't budgeted enough yet
  for (let i = 0; i < postingMonths.length; i++) {
    const currPM = postingMonths[i];
    // log("calculating months ahead");
    const { budgetCategory } = getBudgetCategoryForMonth(
      months,
      parseISO(currPM.month),
      category.categoryGroupID,
      category.categoryID
    );

    if (DEBUG)
      log({
        budgeted: roundNumber(budgetCategory.budgeted, 2),
        pmAmount: roundNumber(currPM.amount, 2),
      });
    if (roundNumber(budgetCategory.budgeted, 2) < roundNumber(currPM.amount, 2))
      break;

    monthsAhead += 1;
  }

  return monthsAhead;
};

export const dueDateAndAmountSet = (
  isMonthly: boolean | undefined,
  nextDueDate: string | undefined,
  categoryAmount: number,
  budgetCategory: BudgetMonthCategory,
  currMonth: Date
) => {
  // We have a non-monthly regular expense, we've posted an amount
  // to this category AND not only is the month we posted to the same
  // as this category's next due date, but the amount available on
  // this budget category has reached the expected "category.amount",
  // so this check will allow us to re-calculate accordingly.
  if (isMonthly == undefined || isMonthly) return false;
  const dtNextDueDate = parseISO(nextDueDate as string);
  return (
    startOfMonth(dtNextDueDate) == currMonth &&
    budgetCategory.available >= categoryAmount
  );
};

//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

export const getCategoryData = async (
  userID: string,
  budget: Budget,
  payFreq: PayFrequency,
  nextPaydate: string
) => {
  const budgetCategories = getBudgetCategories(budget.months[0]).map((bc) => {
    return {
      categoryGroupID: bc.categoryGroupID,
      categoryGroupName: bc.categoryGroupName,
      categoryID: bc.categoryID,
      name: bc.name,
      budgeted: bc.budgeted,
      activity: bc.activity,
      available: bc.available,
    };
  });
  //   log(JSON.stringify({ details: budgetCategories }));

  // ========================
  // 1. Refresh and return categories from database
  // ========================
  const queryRes = await query("spEV_GetCategoryData", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budget.id },
    { name: "Details", value: JSON.stringify({ details: budgetCategories }) },
  ]);
  if (sqlErr(queryRes)) return null;

  // ========================
  // 2. Assemble category list(s)
  // ========================
  const categoryDetails = createCategoryGroupList(
    queryRes.resultData[0],
    budget,
    payFreq,
    nextPaydate
  );
  const excludedCategories = getExcludedCategories(queryRes.resultData[1]);

  return {
    categoryGroups: categoryDetails,
    excludedCategories,
  };
};

export const updateCategoryDetails = async (
  userID: string,
  budgetID: string,
  categories: BudgetMonthCategory[]
) => {
  // TODO: Need to figure out how to convert these categories
  //       to the appropriately-formatted details for the query
  const Details = categories as any;

  const queryRes = await execute("spEV_UpdateCategoryDetails", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budgetID },
    { name: "Details", value: Details },
  ]);
  if (sqlErr(queryRes)) return;

  return categories;
};
