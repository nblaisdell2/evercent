import { addMonths, isEqual, parse, parseISO, startOfMonth } from "date-fns";
import {
  YNABBudget,
  YNABBudgetMonth,
  YNABCategory,
  YNABCategoryGroup,
} from "./ynab";
import { find, getStartOfDay, sum } from "./utils/util";
import { log } from "./utils/log";
import {
  CategoryGroup,
  getAllCategoriesRegularExpenses,
  isRegularExpense,
  PostingMonth,
} from "./category";

const DEBUG = !!process.env.DEBUG;

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

export const createBudget = (budgetData: YNABBudget) => {
  log("Data from YNAB!");
  log(budgetData);
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
  const thisMonth = getStartOfDay(startOfMonth(new Date()).toISOString());

  let tbb = 0;
  const newMonths = months.reduce((prev, curr, i) => {
    const ynabMonth = getStartOfDay(curr.month);
    if (i == 0) {
      tbb = curr.to_be_budgeted / 1000;
      log("TBB = ", tbb);
    }

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
          month: ynabMonth.toISOString(),
          tbb: 0,
        },
      ];
    } else {
      return prev;
    }
  }, [] as BudgetMonth[]);

  // Data comes from YNAB in reverse order, so reverse the order again
  // to get the months data in ascending order
  newMonths.sort((a: BudgetMonth, b: BudgetMonth) => {
    return new Date(a.month).getTime() - new Date(b.month).getTime();
  });

  // console.log("new months 0 = " + JSON.stringify(newMonths));
  if (newMonths[0]) {
    newMonths[0].tbb = tbb;

    // Append 10-years-worth more months at the end of the list, in case I need them
    // for calculating "posting months" into the future
    let lastMonth = newMonths[newMonths.length - 1];
    let currMonth = parseISO(lastMonth.month.substring(0, 10));
    for (let i = 0; i < 120; i++) {
      currMonth = addMonths(currMonth, 1);
      newMonths.push({
        ...lastMonth,
        month: getStartOfDay(currMonth.toISOString()).toISOString(),
      });
    }
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
  const monthStr = dtNextDueDateMonth.toISOString();

  // Get BudgetMonthCategory from the same month of
  // this category's next due date
  return find(
    months,
    (bm) => bm.month.substring(0, 10) == monthStr.substring(0, 10)
  );
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

export const getTotalAvailableInBudget = (budget: Budget) => {
  // Check to see if there's any money in the "To Be Assigned" section
  // from the first (current) budget month
  const tbb = budget.months[0].tbb;
  // log("Adding to Total Available (TBB):", tbb);

  // Go through all the "available" amounts for the latest budget month
  const finalBM = budget.months[budget.months.length - 1];
  // log("Final BM", finalBM);
  const available = finalBM.groups.reduce((prev, curr) => {
    const groupTotal = curr.categories.reduce((prev2, curr2) => {
      if (curr2.hidden || curr2.deleted) return prev2;
      return prev2 + curr2.available;
    }, 0);
    // log(
    //   "Adding to Total Available (group):",
    //   curr.categoryGroupName,
    //   groupTotal
    // );
    return prev + groupTotal;
  }, 0);

  // Then, after adding those values up, and it should be the total available
  // in the user's budget
  return tbb + available;
};

export const getTotalBudgetedByMonth = (
  budget: Budget,
  regularExpenses: CategoryGroup[]
): PostingMonth[] => {
  const regCategories = getAllCategoriesRegularExpenses(regularExpenses, false);
  return budget.months.reduce((prev, curr, i) => {
    if (i == 0) return prev;

    let totalBudgeted = 0;
    for (let i = 0; i < regCategories.length; i++) {
      const bc = getBudgetCategory(
        curr,
        regCategories[i].categoryGroupID,
        regCategories[i].categoryID
      );
      totalBudgeted += bc.budgeted;
    }
    if (totalBudgeted <= 0) return prev;

    return [
      ...prev,
      {
        amount: totalBudgeted,
        month: curr.month,
        percent: 0,
      },
    ];
  }, [] as PostingMonth[]);
};

// TODO: Whoa, what the heck is going on here?
export const getTotalBudgetedByMonthRegular = (
  categoryGroups: CategoryGroup[],
  budget: Budget,
  groupID?: string,
  categoryID?: string
): PostingMonth[] => {
  return budget.months.reduce((prev, curr, i) => {
    if (i == 0) return prev;

    let totalBudgeted = 0;
    if (groupID == undefined && categoryID == undefined) {
      totalBudgeted = sum(curr.groups, "budgeted");
    } else if (groupID != undefined && categoryID == undefined) {
      const thisGrp = find(
        curr.groups,
        (g) => g.categoryGroupID.toLowerCase() == groupID.toLowerCase()
      );
      const evCats = find(
        categoryGroups,
        (cg) =>
          cg.groupID.toLowerCase() == thisGrp.categoryGroupID.toLowerCase()
      )?.categories;

      for (let j = 0; j < thisGrp.categories.length; j++) {
        const budCat = thisGrp.categories[j];
        const evCat = find(
          evCats,
          (c) => c.categoryID.toLowerCase() == budCat.categoryID.toLowerCase()
        );
        if (!evCat) continue;

        if (isRegularExpense(evCat)) {
          totalBudgeted += budCat.budgeted;
        }
      }
    } else if (groupID && categoryID) {
      const thisGrp = find(
        curr.groups,
        (g) => g.categoryGroupID.toLowerCase() == groupID.toLowerCase()
      );
      const thisCat = find(
        thisGrp.categories,
        (c) => c.categoryID.toLowerCase() == categoryID.toLowerCase()
      );
      const evCats = find(
        categoryGroups,
        (cg) =>
          cg.groupID.toLowerCase() == thisGrp.categoryGroupID.toLowerCase()
      ).categories;
      const evCat = find(
        evCats,
        (c) => c.categoryID.toLowerCase() == thisCat.categoryID.toLowerCase()
      );

      if (isRegularExpense(evCat)) {
        totalBudgeted = thisCat.budgeted;
      }
    }

    if (totalBudgeted <= 0) return prev;

    return [
      ...prev,
      {
        amount: totalBudgeted,
        month: curr.month,
        percent: 0,
      },
    ];
  }, [] as PostingMonth[]);
};
