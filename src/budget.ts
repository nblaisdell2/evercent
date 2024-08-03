import { addMonths, isEqual, parseISO, startOfMonth } from "date-fns";
import ynab, {
  getNewAccessTokens,
  GetURL_YNABAuthorizationPage,
  YNABBudget,
  YNABBudgetMonth,
  YNABCategory,
  YNABCategoryGroup,
  YnabReq,
} from "./ynab";
import { find, generateUUID, sum } from "./utils/util";
import { execute, sqlErr } from "./utils/sql";
import { EvercentResponse, getResponse, getResponseError } from "./evercent";

export const FAKE_BUDGET_ID = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEFFFFFF";

export type Budget = {
  id: string;
  name: string;
  months: BudgetMonth[];
};

export type BudgetMonth = {
  month: string;
  tbb: number;
  groups: BudgetMonthCategoryGroup[];
};

export type BudgetMonthCategoryGroup = {
  categoryGroupID: string;
  categoryGroupName: string;
  budgeted: number;
  activity: number;
  available: number;
  categories: BudgetMonthCategory[];
  hidden: boolean;
  deleted: boolean;
};

export type BudgetMonthCategory = {
  categoryGroupID: string;
  categoryGroupName: string;
  categoryID: string;
  name: string;
  budgeted: number;
  activity: number;
  available: number;
  hidden?: boolean;
  deleted?: boolean;
};

const createBudget = (budgetData: YNABBudget) => {
  return {
    id: budgetData.id,
    name: budgetData.name,
    months: createBudgetMonths(
      budgetData.months,
      budgetData.category_groups,
      budgetData.categories
    ),
  };
};

const createBudgetMonths = (
  months: YNABBudgetMonth[],
  category_groups: YNABCategoryGroup[],
  categories: YNABCategory[]
): BudgetMonth[] => {
  const thisMonth = startOfMonth(new Date());

  let tbb = 0;
  const newMonths = months.reduce((prev, curr, i) => {
    const ynabMonth = parseISO(curr.month as string);
    if (i == 0) tbb = curr.to_be_budgeted / 1000;

    if (ynabMonth > thisMonth || isEqual(ynabMonth, thisMonth)) {
      const groups = createBudgetCategoryGroups(
        category_groups,
        curr.categories,
        categories
      );
      return [
        ...prev,
        {
          groups,
          month: curr.month,
          tbb: 0,
        },
      ];
    } else {
      return prev;
    }
  }, [] as BudgetMonth[]);

  // Data comes from YNAB in reverse order, to reverse the order again
  // to get the months data in ascending order
  newMonths.sort((a: BudgetMonth, b: BudgetMonth) => {
    return new Date(a.month).getTime() - new Date(b.month).getTime();
  });

  // console.log("new months 0 = " + JSON.stringify(newMonths));
  newMonths[0].tbb = tbb;

  // Append 10-years-worth more months at the end of the list, in case I need them
  // for calculating "posting months" into the future
  let lastMonth = newMonths[newMonths.length - 1];
  let currMonth = parseISO(lastMonth.month);
  for (let i = 0; i < 120; i++) {
    currMonth = addMonths(currMonth, 1);
    newMonths.push({
      ...lastMonth,
      month: currMonth.toISOString().substring(0, 10),
    });
  }

  return newMonths;
};

const createBudgetCategoryGroups = (
  groups: YNABCategoryGroup[],
  monthCategories: YNABCategory[],
  sortedCategories: YNABCategory[]
): BudgetMonthCategoryGroup[] => {
  return groups.map((curr) => {
    const newCategories = createBudgetCategories(
      curr.id,
      curr.name,
      monthCategories,
      sortedCategories
    );
    const totalActivity = sum(newCategories, "activity");
    const totalBudgeted = sum(newCategories, "budgeted");
    const totalAvailable = sum(newCategories, "available");

    return {
      categoryGroupID: curr.id,
      categoryGroupName: curr.name,
      activity: totalActivity,
      budgeted: totalBudgeted,
      available: totalAvailable,
      categories: newCategories,
      hidden: curr.hidden,
      deleted: curr.deleted,
    };
  });
};

const createBudgetCategories = (
  groupID: string,
  groupName: string,
  monthCategories: YNABCategory[],
  sortedCategories: YNABCategory[]
): BudgetMonthCategory[] => {
  const filteredSortedCategories = sortedCategories.filter(
    (c) => c.category_group_id.toLowerCase() == groupID.toLowerCase()
  );

  const newCategories = filteredSortedCategories.reduce((prev, curr) => {
    const monthCategory = find(
      monthCategories,
      (mc) => mc.id.toLowerCase() == curr.id.toLowerCase()
    );
    if (!monthCategory) return prev;
    return [
      ...prev,
      {
        categoryGroupID: groupID,
        categoryGroupName: groupName,
        categoryID: monthCategory.id,
        name: monthCategory.name,
        budgeted: monthCategory.budgeted / 1000,
        activity: monthCategory.activity / 1000,
        available: monthCategory.balance / 1000,
        hidden: monthCategory.hidden,
        deleted: monthCategory.deleted,
      } as BudgetMonthCategory,
    ];
  }, [] as BudgetMonthCategory[]);

  return newCategories;
};

export const removeHiddenCategoriesFromBudget = (budget: Budget): Budget => {
  return {
    ...budget,
    months: budget.months.map((m) => {
      return {
        ...m,
        groups: m.groups
          .filter((g) => !g.hidden && !g.deleted)
          .map((g) => {
            return {
              ...g,
              categories: g.categories.filter((c) => !c.hidden && !c.deleted),
            };
          }),
      };
    }),
  };
};

export const getBudgetGroupByID = (month: BudgetMonth, groupID: string) => {
  const budgetGroup = find(
    month.groups,
    (grp) => grp.categoryGroupID.toLowerCase() == groupID.toLowerCase()
  );
  return budgetGroup;
};

export const getBudgetCategoryByID = (
  categoryGroup: BudgetMonthCategoryGroup,
  categoryID: string
) => {
  const budgetCategory = find(
    categoryGroup.categories,
    (cat) => cat.categoryID.toLowerCase() == categoryID.toLowerCase()
  );
  return budgetCategory;
};

export const getBudgetCategoryForMonth = (
  months: BudgetMonth[],
  dt: Date,
  categoryGroupID: string,
  categoryID: string
) => {
  const budgetMonth = getBudgetMonth(months, dt);
  const budgetCategory = getBudgetCategory(
    budgetMonth,
    categoryGroupID,
    categoryID
  );
  return { budgetMonth, budgetCategory };
};

export const getBudgetMonth = (months: BudgetMonth[], dt: Date) => {
  const dtNextDueDateMonth = startOfMonth(dt);
  const monthStr = dtNextDueDateMonth.toISOString().substring(0, 10);

  // Get BudgetMonthCategory from the same month of
  // this category's next due date
  return find(months, (bm) => bm.month == monthStr);
};

export const getBudgetCategories = (month: BudgetMonth) => {
  return month.groups.reduce((prev, curr) => {
    return [...prev, ...curr.categories.filter((c) => !c.hidden && !c.deleted)];
  }, [] as BudgetMonthCategory[]);
};

export const getBudgetCategory = (
  month: BudgetMonth,
  groupID: string,
  categoryID: string
) => {
  const budgetGroup = getBudgetGroupByID(month, groupID);
  const budgetCategory = getBudgetCategoryByID(budgetGroup, categoryID);
  return budgetCategory;
};

////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////

export const connectToYNAB = async ({
  userID,
}: {
  userID: string;
}): Promise<EvercentResponse<string>> => {
  const url = GetURL_YNABAuthorizationPage(userID);
  if (!url)
    return getResponseError(`Could not connect to budget for user: ${userID}`);

  return getResponse(url, `Got YNAB url for user: ${userID}`);
};

export const getBudget = async ({
  userID,
  budgetID,
}: {
  userID: string;
  budgetID: string;
}): Promise<EvercentResponse<Budget | null>> => {
  // Get Budget details from YNAB using their API
  const budget = await ynab(userID, budgetID, YnabReq.getBudget);
  if (!budget) {
    return getResponseError(
      `Could not retrieve budget details from YNAB for user/budget: ${userID} / ${budgetID}`
    );
  }

  // If we got the YNAB Budget data, convert it into our own
  // Budget object before sending to the user
  return getResponse(createBudget(budget), "Got budget for user: " + userID);
};

export const getBudgetsList = async ({
  userID,
}: {
  userID: string;
}): Promise<EvercentResponse<Pick<YNABBudget, "id" | "name">[] | null>> => {
  const budgetsList = await ynab(
    userID,
    FAKE_BUDGET_ID,
    YnabReq.getBudgetsList
  );
  if (!budgetsList) {
    return getResponseError("Could not get budgets list for user: " + userID);
  }

  return getResponse(budgetsList, "Got budgets list for user: " + userID);
};

export const switchBudget = async ({
  userID,
  newBudgetID,
}: {
  userID: string;
  newBudgetID: string;
}): Promise<EvercentResponse<{ newBudgetID: string } | null>> => {
  const budget = await ynab(userID, newBudgetID, YnabReq.getBudget);
  if (!budget) {
    return getResponseError(
      `Could not switch to new budget: ${newBudgetID} (User: ${userID})`
    );
  }

  if (newBudgetID == FAKE_BUDGET_ID) newBudgetID = budget.id;

  // Convert the YNAB category format into the minimal amount
  // of data required to save the results to the database
  const newCategories = budget.categories.map((c) => {
    return {
      guid: generateUUID(),
      categoryGroupID: c.category_group_id,
      categoryID: c.id,
      amount: 0,
      extraAmount: 0,
      isRegularExpense: false,
      isUpcomingExpense: false,
    };
  });
  const strCats = JSON.stringify({ details: newCategories });

  const queryRes = await execute("spEV_UpdateInitialYNABDetails", [
    { name: "UserID", value: userID },
    { name: "NewBudgetID", value: newBudgetID },
    { name: "Details", value: strCats },
  ]);
  if (sqlErr(queryRes)) {
    return getResponseError(
      "Could not update YNAB details in database! " + strCats
    );
  }

  return getResponse(
    { newBudgetID },
    `Switched to new budget: ${newBudgetID} (User: ${userID})`
  );
};

export const authorizeBudget = async ({
  userID,
  code,
}: {
  userID: string;
  code: string;
}): Promise<EvercentResponse<{ redirectURL: string } | null>> => {
  const newTokens = await getNewAccessTokens(code);
  if (!newTokens) {
    return getResponseError("Could not get new tokens from YNAB API");
  }

  // Save token details in DB for this user
  let sqlRes = await execute("spEV_YNAB_SaveTokenDetails", [
    { name: "UserID", value: userID },
    { name: "AccessToken", value: newTokens.accessToken },
    { name: "RefreshToken", value: newTokens.refreshToken },
    { name: "ExpirationDate", value: newTokens.expirationDate },
  ]);
  if (sqlErr(sqlRes)) {
    return getResponseError("Could not updated new tokens in database!");
  }

  await switchBudget({ userID, newBudgetID: FAKE_BUDGET_ID });

  const redirectURL = process.env.SERVER_CLIENT_BASE_URL as string;
  return getResponse(
    { redirectURL },
    "Please send the user to the redirect URL provided"
  );
};

export const updateBudgetCategoryAmount = async ({
  userID,
  budgetID,
  categoryID,
  month,
  newBudgetedAmount,
}: {
  userID: string;
  budgetID: string;
  categoryID: string;
  month: string;
  newBudgetedAmount: number;
}): Promise<EvercentResponse<{ categoryMsg: string } | null>> => {
  const updatedCategory = await ynab(
    userID,
    budgetID,
    YnabReq.updateYNABCategoryAmount,
    categoryID,
    month,
    newBudgetedAmount
  );
  if (!updatedCategory) {
    return getResponseError(
      `Could not update category amount in budget: ${budgetID} (User: ${userID})`
    );
  }

  const updateMsg = `(${userID} / ${budgetID}) // Updated amount for '${
    updatedCategory.name
  } (${categoryID})' on '${month}' to '$${Number(newBudgetedAmount).toFixed(
    2
  )}'`;
  return getResponse({ categoryMsg: updateMsg }, updateMsg);
};
