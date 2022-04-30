import { useState } from "react";
import { parseISO } from "date-fns";
import {
  getMonthDetails,
  getCategoryAmountModifiedWithoutExtra,
} from "../evercent";

function useBudgetCategory(categoryIn) {
  const [category, setCategory] = useState(categoryIn);

  const [showUpcoming, setShowUpcoming] = useState(
    categoryIn.upcomingExpense !== null
  );
  const [showRegular, setShowRegular] = useState(
    categoryIn.expenseType !== null
  );

  const [expenseDate, setExpenseDate] = useState(
    categoryIn.expenseDate ? parseISO(categoryIn.expenseDate) : new Date()
  );

  const UpdateType = {
    CATEGORY_AMOUNT: 0,
    EXTRA_AMOUNT: 1,
    UPCOMING_EXPENSE: 2,
    TOGGLE_ON_CHART: 3,
    TOGGLE_TOGGLE_INCLUDE: 4,
    TOGGLE_ALWAYS_CURRENT: 5,
    TOGGLE_EXPENSE_REPEAT: 6,
    REGULAR_EXPENSE_DETAILS: 7,
    EXPENSE_TYPE: 8,
    EXPENSE_FREQ_NUM: 9,
    EXPENSE_FREQ_TYPE: 10,
    EXPENSE_DATE: 11,
    SET_UPCOMING_EXPENSE: 12,
    TOGGLE_MULTIPLE_TRANSACTIONS: 13,
  };

  const getNewCategory = (prop, val) => {
    let newCategory = { ...category };
    newCategory[prop] = val;
    return newCategory;
  };

  const monthDiff = (dateFrom, dateTo) => {
    return (
      dateTo.getMonth() -
      dateFrom.getMonth() +
      12 * (dateTo.getFullYear() - dateFrom.getFullYear())
    );
  };

  const setCategoryAmount = (amt) => {
    console.log("HOOK: setCategoryAmount");
    let newCat = getNewCategory("categoryAmount", amt);

    setCategory(newCat);
  };

  const setExtraAmount = (amt) => {
    console.log("HOOK: setExtraAmount");
    let newCat = getNewCategory("extraAmount", amt);

    setCategory(newCat);
  };

  const setUpcomingExpense = (upcomingExpense) => {
    console.log("HOOK: setUpcomingExpense");
    let newCat = getNewCategory("upcomingExpense", upcomingExpense);

    setCategory(newCat);
  };

  const toggleIncludeOnChart = () => {
    console.log("HOOK: toggleIncludeOnChart");
    let newCat = getNewCategory(
      "includeOnChart",
      category.includeOnChart == 0 || category.includeOnChart == null ? 1 : 0
    );

    setCategory(newCat);
  };

  const toggleToggleInclude = () => {
    console.log("HOOK: toggleToggleInclude");
    let newCat = getNewCategory(
      "toggleInclude",
      category.toggleInclude == 0 || category.toggleInclude == null ? 1 : 0
    );

    setCategory(newCat);
  };

  const toggleAlwaysIncludeCurrentMonth = () => {
    console.log("HOOK: toggleAlwaysIncludeCurrentMonth");
    let newCat = getNewCategory(
      "useCurrentMonth",
      category.useCurrentMonth == 0 || category.useCurrentMonth == null ? 1 : 0
    );

    setCategory(newCat);
  };

  const toggleMultipleTransactions = () => {
    console.log("HOOK: toggleMultipleTransactions");
    let newCat = getNewCategory(
      "multipleTransactions",
      category.multipleTransactions == 0 ||
        category.multipleTransactions == null
        ? 1
        : 0
    );

    setCategory(newCat);
  };

  const toggleExpenseRepeat = () => {
    console.log("HOOK: toggleExpenseRepeat");
    let newCat = { ...category };
    if (newCat.repeatFreqNum == null) {
      newCat.repeatFreqNum = 1;
      newCat.repeatFreqType = "Months";
    } else {
      newCat.repeatFreqNum = null;
      newCat.repeatFreqType = null;
    }

    setCategory(newCat);
  };

  const setRegularExpensesDetails = () => {
    console.log("HOOK: setRegularExpensesDetails");
    let newCat = { ...category };

    newCat.includeOnChart = 1;
    newCat.toggleInclude = 0;
    newCat.useCurrentMonth = 0;
    newCat.expenseType = showRegular ? null : "Monthly";
    newCat.repeatFreqNum = showRegular ? null : 1;
    newCat.repeatFreqType = showRegular ? null : "Months";

    console.log("Setting show regular to ", !showRegular);
    setShowRegular(!showRegular);

    setCategory(newCat);
  };

  const setExpenseType = (expenseType) => {
    console.log("HOOK: setExpenseType", expenseType);
    let newCat = { ...category };
    newCat.expenseType = expenseType;

    let newExpenseDate = null;
    // if (newCat.expenseType == "By Date") {
    //   newExpenseDate = new Date();
    //   newCat.expenseMonthsDivisor = 1;
    //   newCat.repeatFreqNum = 1;
    //   newCat.repeatFreqType = "Months";
    // } else {
    //   newExpenseDate = new Date();
    //   newCat.expenseMonthsDivisor = null;
    //   newCat.repeatFreqNum = null;
    //   newCat.repeatFreqType = null;
    // }
    // newExpenseDate = new Date();
    newCat.expenseMonthsDivisor = 1;
    newCat.repeatFreqNum = 1;
    newCat.repeatFreqType = "Months";

    // newCat.expenseDate = newExpenseDate.toISOString();
    setExpenseDate(newCat.expenseDate);

    setCategory(newCat);
  };

  const setRepeatFrequencyNum = (newNum) => {
    console.log("HOOK: setRepeatFrequencyNum");
    let newCat = getNewCategory("repeatFreqNum", parseInt(newNum));

    setCategory(newCat);
  };

  const setRepeatFrequencyType = (newType) => {
    console.log("HOOK: setRepeatFrequencyType");
    let newCat = getNewCategory("repeatFreqType", newType);

    setCategory(newCat);
  };

  const setCategoryExpenseDate = (newExpenseDate) => {
    console.log("HOOK: setCategoryExpenseDate");
    let newCat = getNewCategory("expenseDate", newExpenseDate.toISOString());

    // First, determine what the divisor would be IF we had already passed it
    // Then, get that modAmount
    let newDivisor = monthDiff(new Date(), newExpenseDate) + 1;
    let potentialDivisor =
      newCat.repeatFreqNum * (newCat.repeatFreqType == "Months" ? 1 : 12);

    newCat.expenseMonthsDivisor = potentialDivisor;
    let modAmt = getCategoryAmountModifiedWithoutExtra(newCat);

    // Then, check the months list for this category, and see if that modAmount
    // has already been funded for this month
    let ynabMonthList = getMonthDetails();
    console.log(ynabMonthList);

    let monthsFunded = 0;
    for (let i = 0; i < ynabMonthList.length; ++i) {
      let monthCat = ynabMonthList[i].categories.find((x) => x.id == newCat.id);
      if (monthCat.budgeted / 1000 < modAmt) {
        break;
      }
      monthsFunded += 1;
    }

    // If the number of months funded is greater than the number of months between
    // the new expense date and today, then we should use the divisor for when it's
    // already passed. Otherwise, use the divisor between expense date & today.
    newCat.expenseMonthsDivisor =
      monthsFunded >= newDivisor ? potentialDivisor : newDivisor;

    setExpenseDate(newExpenseDate.toISOString());

    setCategory(newCat);
  };

  const toggleUpcomingExpensesSection = () => {
    if (showUpcoming && category.upcomingExpense) {
      setUpcomingExpense(null);
    }
    setShowUpcoming(!showUpcoming);
  };

  const updateCategory = (updateTyp) => {
    let updName = "";
    switch (updateTyp) {
      case UpdateType.CATEGORY_AMOUNT:
        updName = "CATEGORY_AMOUNT";
        break;
      case UpdateType.EXTRA_AMOUNT:
        updName = "EXTRA_AMOUNT";
        break;
      case UpdateType.UPCOMING_EXPENSE:
        updName = "UPCOMING_EXPENSE";
        break;
      case UpdateType.SET_UPCOMING_EXPENSE:
        updName = "SET_UPCOMING_EXPENSE";
        break;
      case UpdateType.TOGGLE_ON_CHART:
        updName = "TOGGLE_ON_CHART";
        break;
      case UpdateType.TOGGLE_TOGGLE_INCLUDE:
        updName = "TOGGLE_TOGGLE_INCLUDE";
        break;
      case UpdateType.TOGGLE_ALWAYS_CURRENT:
        updName = "TOGGLE_ALWAYS_CURRENT";
        break;
      case UpdateType.TOGGLE_EXPENSE_REPEAT:
        updName = "TOGGLE_EXPENSE_REPEAT";
        break;
      case UpdateType.REGULAR_EXPENSE_DETAILS:
        updName = "REGULAR_EXPENSE_DETAILS";
        break;
      case UpdateType.EXPENSE_TYPE:
        updName = "EXPENSE_TYPE";
        break;
      case UpdateType.EXPENSE_FREQ_NUM:
        updName = "EXPENSE_FREQ_NUM";
        break;
      case UpdateType.EXPENSE_FREQ_TYPE:
        updName = "EXPENSE_FREQ_TYPE";
        break;
      case UpdateType.EXPENSE_DATE:
        updName = "EXPENSE_DATE";
        break;
      case UpdateType.TOGGLE_MULTIPLE_TRANSACTIONS:
        updName = "TOGGLE_MULTIPLE_TRANSACTIONS";
        break;
    }
    console.log(
      "HOOK: updateCategory - About to run the following query: " + updName
    );

    switch (updateTyp) {
      case UpdateType.CATEGORY_AMOUNT:
        return setCategoryAmount;
      case UpdateType.EXTRA_AMOUNT:
        return setExtraAmount;

      case UpdateType.UPCOMING_EXPENSE:
        return toggleUpcomingExpensesSection;
      case UpdateType.REGULAR_EXPENSE_DETAILS:
        return setRegularExpensesDetails;

      case UpdateType.SET_UPCOMING_EXPENSE:
        return setUpcomingExpense;

      case UpdateType.TOGGLE_ON_CHART:
        return toggleIncludeOnChart;
      case UpdateType.TOGGLE_TOGGLE_INCLUDE:
        return toggleToggleInclude;
      case UpdateType.TOGGLE_ALWAYS_CURRENT:
        return toggleAlwaysIncludeCurrentMonth;
      case UpdateType.TOGGLE_EXPENSE_REPEAT:
        return toggleExpenseRepeat;
      case UpdateType.TOGGLE_MULTIPLE_TRANSACTIONS:
        return toggleMultipleTransactions;
      case UpdateType.EXPENSE_TYPE:
        return setExpenseType;
      case UpdateType.EXPENSE_FREQ_NUM:
        return setRepeatFrequencyNum;
      case UpdateType.EXPENSE_FREQ_TYPE:
        return setRepeatFrequencyType;
      case UpdateType.EXPENSE_DATE:
        return setCategoryExpenseDate;
      default:
        return null;
    }
  };

  return [category, showUpcoming, showRegular, UpdateType, updateCategory];
}

export default useBudgetCategory;
