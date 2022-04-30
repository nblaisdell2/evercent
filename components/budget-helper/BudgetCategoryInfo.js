import { useEffect, useState } from "react";
import ArrowLeft from "@heroicons/react/outline/ArrowLeftIcon";

import DateTimePicker from "../util/DateTimePicker";
import NumberInput from "../util/NumberInput";
// import MyCheckbox from "../util/MyCheckbox";
import MyDropdown from "../util/MyDropdown";

import { replaceCategory } from "../../evercent";
import useBudgetCategory from "../../hooks/useBudgetCategory";

import MySlider from "../util/MySlider";
import MyToggleSwitch from "../util/MyToggleSwitch";
import MyHelpIcon from "../util/MyHelpIcon";

import data from "../../data.json";

function BudgetCategoryInfo(props) {
  const [category, showUpcoming, showRegular, UpdateType, updateCategory] =
    useBudgetCategory(props.category);

  const [firstLoad, setFirstLoad] = useState(true);

  const getHeader = (headerName) => {
    let modal = "";
    switch (headerName) {
      case "Amount":
        modal = data.Modals.HELP_CAT_AMOUNT;
        break;
      case "Extra Amount":
        modal = data.Modals.HELP_CAT_EXTRA_AMOUNT;
        break;
      case "% of Monthly Income":
        modal = data.Modals.HELP_CAT_PERCENT_INCOME;
        break;
      case "6 Months Expense":
        modal = data.Modals.HELP_CAT_OPTION_REGULAR;
        break;
      case "Upcoming Expense":
        modal = data.Modals.HELP_CAT_OPTION_UPCOMING;
        break;
      case "Frequency":
        modal = data.Modals.HELP_CAT_FREQUENCY;
        break;
      case "Next Due Date":
        modal = data.Modals.HELP_CAT_DUE_DATE;
        break;
      case "Repeat Every?":
        modal = data.Modals.HELP_CAT_REPEAT_EVERY;
        break;
      case "Include on Chart?":
        modal = data.Modals.HELP_CAT_INCLUDE;
        break;
      case "Always Use Current Month?":
        modal = data.Modals.HELP_CAT_ALWAYS_USE_CURRENT;
        break;
      case "Multiple Monthly Transactions?":
        modal = data.Modals.HELP_CAT_MULTIPLE_TRANSACTIONS;
        break;
      default:
        modal = "";
        break;
    }

    return (
      <div className="flex justify-center items-center">
        <MyHelpIcon sizeInPx={20} helpModal={modal} isDarker={true} />
        <div className="font-medium text-sm my-1">{headerName}</div>
      </div>
    );
  };

  useEffect(() => {
    if (firstLoad) {
      setFirstLoad(false);
    } else {
      console.log("useEffect - category updated. Updating parent list");
      let newUserList = [...props.userCategoryList];
      replaceCategory(newUserList, category);

      props.setCategory(category);
      props.setUserCategoryList(newUserList);
      props.setChangesMade(true);
    }
  }, [category]);

  let amountPercent =
    props.userDetails.MonthlyAmount == 0
      ? 0
      : ((category.categoryAmount + category.extraAmount) /
          props.userDetails.MonthlyAmount) *
        100;

  console.log("AMOUNT PERCENT", amountPercent);
  console.log("what is the expense date?", category.expenseDate);

  return (
    <div>
      {/* Back Arrow */}
      <div className="flex justify-between">
        <ArrowLeft
          className="h-8 cursor-pointer"
          onClick={() => {
            props.setCategory(null);
          }}
        />
      </div>

      {/* Category Name */}
      <div className="text-center font-bold text-3xl my-2">
        <h2>{category.name}</h2>
      </div>

      <div className="h-[600px] overflow-y-auto">
        {/* Category Amounts & Slider */}
        <div className="flex justify-evenly rounded-2xl border border-gray-500 bg-gray-200 p-1 items-center">
          {/* Category Amount (direct) */}
          <div className="flex flex-col text-center justify-between p-2 pt-1">
            {getHeader("Amount")}
            <div className="flex-grow">
              <NumberInput
                value={category.categoryAmount}
                setValue={(newNum) => {
                  updateCategory(UpdateType.CATEGORY_AMOUNT)(newNum);
                }}
                className="text-right"
              />
            </div>

            {getHeader("Extra Amount")}
            <div className="flex-grow">
              <NumberInput
                value={category.extraAmount}
                setValue={(newNum) => {
                  updateCategory(UpdateType.EXTRA_AMOUNT)(newNum);
                }}
                className="text-right"
              />
            </div>
          </div>

          {/* Monthly Income % (slider) */}
          <div className="flex-grow p-2 pt-1 text-center items-center">
            {getHeader("% of Monthly Income")}

            <div>
              <MySlider
                start={amountPercent}
                onChange={(newX) => {
                  updateCategory(UpdateType.CATEGORY_AMOUNT)(
                    Math.round(
                      (props.userDetails.MonthlyAmount - category.extraAmount) *
                        (newX / 100)
                    )
                  );
                }}
              />
            </div>

            <div>{amountPercent.toFixed(0) + "%"}</div>
          </div>
        </div>

        {/* OPTIONS */}
        <div className="mt-5  rounded-2xl border border-gray-500 bg-gray-200 p-1">
          <h2 className="text-center font-semibold">OPTIONS</h2>

          <div className="flex justify-evenly">
            <MyToggleSwitch
              label={getHeader("6 Months Expense")}
              checked={showRegular}
              onClick={() =>
                updateCategory(UpdateType.REGULAR_EXPENSE_DETAILS)()
              }
            />

            <MyToggleSwitch
              label={getHeader("Upcoming Expense")}
              checked={showUpcoming}
              onClick={() => updateCategory(UpdateType.UPCOMING_EXPENSE)()}
            />
          </div>
        </div>

        {/* Regular Expenses section */}
        {showRegular && (
          <div className="mt-5  rounded-2xl border border-gray-500 bg-gray-200 p-1">
            <h2 className="text-center font-semibold">REGULAR EXPENSE</h2>

            {/* Row 1 */}
            <div className="flex justify-evenly my-3">
              <div className="flex flex-col items-center">
                {getHeader("Frequency")}
                <MyDropdown
                  value={category.expenseType}
                  options={["Monthly", "By Date"]}
                  onChange={(newType) =>
                    updateCategory(UpdateType.EXPENSE_TYPE)(newType)
                  }
                />
              </div>

              <div className="flex flex-col items-center">
                {getHeader("Next Due Date")}
                <DateTimePicker
                  autoDate={category.expenseDate}
                  setAutoDate={updateCategory(UpdateType.EXPENSE_DATE)}
                />
              </div>

              <div className="flex justify-between">
                <div className="flex flex-col items-center ml-5">
                  {getHeader("Repeat Every?")}
                  <div className="flex justify-between">
                    <MyDropdown
                      value={category.repeatFreqNum}
                      options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
                      onChange={(newVal) => {
                        updateCategory(UpdateType.EXPENSE_FREQ_NUM)(newVal);
                      }}
                      disabled={category.expenseType == "Monthly"}
                    />
                    <div className="mx-2"></div>
                    <MyDropdown
                      value={category.repeatFreqType}
                      options={["Months", "Years"]}
                      onChange={(newVal) => {
                        updateCategory(UpdateType.EXPENSE_FREQ_TYPE)(newVal);
                      }}
                      disabled={category.expenseType == "Monthly"}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex justify-center">
              <div className="flex justify-evenly items-center w-full">
                <MyToggleSwitch
                  label={getHeader("Include on Chart?")}
                  checked={category.includeOnChart}
                  onClick={() => updateCategory(UpdateType.TOGGLE_ON_CHART)()}
                />
                {/* <MyCheckbox
                    label={"Toggle Include?"}
                    checked={category.toggleInclude}
                    onClick={() =>
                      updateCategory(UpdateType.TOGGLE_TOGGLE_INCLUDE)()
                    }
                  /> */}
                <MyToggleSwitch
                  label={getHeader("Always Use Current Month?")}
                  checked={category.useCurrentMonth}
                  onClick={() =>
                    updateCategory(UpdateType.TOGGLE_ALWAYS_CURRENT)()
                  }
                />
                <MyToggleSwitch
                  label={getHeader("Multiple Monthly Transactions?")}
                  checked={category.multipleTransactions}
                  onClick={() =>
                    updateCategory(UpdateType.TOGGLE_MULTIPLE_TRANSACTIONS)()
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Expenses section */}
        {showUpcoming && (
          <div className="mt-5  rounded-2xl border border-gray-500 bg-gray-200 p-1">
            <h2 className="text-center font-semibold">UPCOMING EXPENSE</h2>

            <div className="flex p-2 items-center">
              <div className="flex justify-center items-center">
                <MyHelpIcon
                  sizeInPx={25}
                  helpModal={data.Modals.HELP_CAT_OPTION_UPCOMING}
                  isDarker={true}
                />
                <h3>Enter the total purchase amount</h3>
              </div>
              <NumberInput
                className="flex-grow ml-5 text-right"
                value={category.upcomingExpense || 0}
                setValue={(newNum) => {
                  updateCategory(UpdateType.SET_UPCOMING_EXPENSE)(newNum);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BudgetCategoryInfo;
