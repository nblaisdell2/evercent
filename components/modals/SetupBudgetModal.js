import { useState, useEffect } from "react";
import Router from "next/router";

import data from "../../data.json";
import { PostCategoryMonth } from "../../ynab";
import { getSetupCategoriesWithMonths, getNewTokens } from "../../evercent";
import { getMoneyString, postAPIDataClient } from "../../utils";

import NumberInput from "../util/NumberInput";
import SetupBudgetListItem from "./SetupBudgetListItem";

function SetupBudgetModal(props) {
  const [startAmt, setStartAmt] = useState(0);
  const [startAmtStatic, setStartAmtStatic] = useState(0);

  const [showSetup, setShowSetup] = useState(false);

  const [sixMoLocal, setSixMoLocal] = useState(
    props.sixMonthDetails.categories
  );
  const [setupCategories, setSetupCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);

  // Returns a Promise that resolves after "ms" Milliseconds
  const timer = (ms) => new Promise((res) => setTimeout(res, ms));

  useEffect(() => {
    let catsWithMonths = getSetupCategoriesWithMonths(
      sixMoLocal,
      expandedCategories
    );
    setSetupCategories(catsWithMonths);

    if (catsWithMonths && catsWithMonths.length > 0 && startAmtStatic !== 0) {
      let parentItems = catsWithMonths.filter((x) => x.isParent);

      let totalAdd = 0;
      for (let i = 0; i < parentItems.length; i++) {
        totalAdd += parseInt(parentItems[i].totalAmount.replace("$", ""));
      }

      setStartAmt(startAmtStatic - totalAdd);
    }
  }, [sixMoLocal, expandedCategories]);

  const showMonthlyView = () => {
    if (startAmt !== 0) {
      setStartAmtStatic(startAmt);
      setShowSetup(true);
    }
  };

  const toggleCategory = (catName, isExpanded) => {
    let newExpandList = [...expandedCategories];
    if (!isExpanded) {
      newExpandList.push(catName);
    } else {
      newExpandList = newExpandList.filter((x) => x !== catName);
    }

    setExpandedCategories(newExpandList);
  };

  const addMonthToCategory = (catID) => {
    let newLocalSixMo = [...sixMoLocal];
    let item = newLocalSixMo.find((x) => x.id == catID);
    item.monthsAhead += 1;
    setSixMoLocal(newLocalSixMo);
  };

  const removeMonthFromCategory = (catID) => {
    let newLocalSixMo = [...sixMoLocal];
    let item = newLocalSixMo.find((x) => x.id == catID);
    if (item.monthsAhead > 0) {
      item.monthsAhead -= 1;
      setSixMoLocal(newLocalSixMo);
    }
  };

  const postCategoryAmountToYNAB = async (
    currAccToken,
    currRefToken,
    monthToSave,
    foundDivisorChanged
  ) => {
    // Get the amount to post to YNAB for this month/category
    let monthAmt = monthToSave.totalAmount.replace("$", "");
    let currBudgeted = monthToSave.currBudgeted;

    console.log("postCategoryAmountToYNAB");
    console.log("monthAmt", monthAmt);

    // POST/PATCH the information to the YNAB API to update the budgeted amount
    // for the given category
    // If we exceed our pre-defined YNAB rate-limit threshold, we'll request a new
    // access token, so we don't interrupt the user trying to update their categories
    await PostCategoryMonth(
      currAccToken,
      monthToSave.id,
      monthToSave.month,
      monthAmt,
      currBudgeted,
      props.userDetails.DefaultBudgetID
    )
      .then(async (rateLim) => {
        // console.log("Rate Limit obj: ", rateLim);
        if (rateLim.overThreshold) {
          await getNewYNABTokens(currRefToken).then((data) => {
            // console.log("What did I get for data?");
            // console.log(data);
            currAccToken = data.data.accToken;
            currRefToken = data.data.refToken;
          });
        }
      })
      .catch((err) => {
        console.log("Error posting amounts to YNAB");
        console.log(err);
      });

    console.log("Posted amount to category in YNAB!");

    // If we are on a month where the expenseMonthsDivisor changed (aka, new year/repeat),
    // update that field in the database
    if (monthToSave.divisorChanged && !foundDivisorChanged) {
      foundDivisorChanged = true;

      // console.log(
      //   "Updating expense months divisor for category: "
      // );
      await postAPIDataClient(data.Queries.UPDATE_CATEGORY_EXPENSE_DATE, {
        UserID: props.userDetails.UserID,
        BudgetID: props.userDetails.DefaultBudgetID,
        CategoryID: monthToSave.id,
      });
    }

    // If we chose to "toggle Include" on this category, then toggle the field
    // in the database for this category.
    if (
      monthToSave.toggleInclude &&
      monthToSave.monthNum >= props.userDetails.MonthsAheadTarget
    ) {
      // console.log(
      //   "Attempting to update the 'IncludeOnChart' field for category: "
      // );
      await postAPIDataClient(data.Queries.UPDATE_CATEGORY_INCLUDE, {
        UserID: props.userDetails.UserID,
        BudgetID: props.userDetails.DefaultBudgetID,
        CategoryID: monthToSave.id,
      });
    }

    return [currAccToken, currRefToken, foundDivisorChanged];
  };

  const saveToYNAB = async () => {
    let currAccToken = props.userDetails.AccessToken;
    let currRefToken = props.userDetails.RefreshToken;

    let parentItems = setupCategories.filter((x) => x.isParent);
    let foundDivisorChanged = false;
    for (let i = 0; i < parentItems.length; i++) {
      let catTotalAmt = parseInt(parentItems[i].totalAmount.replace("$", ""));
      if (catTotalAmt > 0) {
        let monthsToSave = setupCategories.filter(
          (x) => !x.isParent && x.id == parentItems[i].id
        );
        foundDivisorChanged = false;

        for (let j = 0; j < monthsToSave.length; j++) {
          await timer(1000);

          console.log(
            "Posting amount for   " +
              parentItems[i].name +
              " on " +
              monthsToSave[j].month +
              " (" +
              parseFloat(
                monthsToSave[j].totalAmount.replace("$", "")
              ).toString() +
              ")"
          );

          [currAccToken, currRefToken, foundDivisorChanged] =
            await postCategoryAmountToYNAB(
              currAccToken,
              currRefToken,
              monthsToSave[j],
              foundDivisorChanged
            );
        }
      }
    }

    Router.reload(window.location.pathname);
  };

  const getNewYNABTokens = async (refreshToken) => {
    return await getNewTokens(refreshToken).then((response) => {
      let newUserDetails = { ...props.userDetails };
      newUserDetails.AccessToken = response.data.accToken;
      newUserDetails.ExpirationDate = response.data.expirationDate;
      newUserDetails.RefreshToken = response.data.refToken;

      props.setUserDetails(newUserDetails);

      return response;
    });
  };

  if (!showSetup) {
    return (
      <div className="h-[600px] relative overflow-y-auto flex flex-col justify-center items-center">
        <div className="h-full flex flex-col items-center justify-center">
          <div className="text-5xl font-bold">Enter Starting Amount</div>
          <NumberInput
            value={"$" + startAmt}
            setValue2={(newVal) => {
              setStartAmt(
                newVal?.replace("$", "") == "" || newVal == undefined
                  ? 0
                  : parseInt(newVal.replace("$", ""))
              );
            }}
            onEnter={showMonthlyView}
            className="mt-5 text-center text-4xl font-semibold text-green-500"
          />
        </div>

        <button
          type="button"
          disabled={startAmt == 0 ? "disabled" : ""}
          className={`sticky bottom-0 mt-5 p-3 w-full rounded-md font-bold bg-gray-300 ${
            startAmt == 0
              ? "hover:cursor-not-allowed"
              : "hover:bg-blue-500 hover:text-white"
          }`}
          onClick={showMonthlyView}
        >
          Continue
        </button>
      </div>
    );
  }

  console.log("Setup Categories", setupCategories);

  return (
    <div className="h-[800px] relative overflow-y-auto flex flex-col">
      {/* Amount Remaining Section */}
      <div className="text-center">
        <div className="text-4xl font-bold ">Amount Remaining</div>
        <div
          className={`font-bold text-4xl ${
            parseInt(startAmt.toFixed(0)) < 0
              ? "text-red-500"
              : "text-green-500"
          }`}
        >
          {getMoneyString(startAmt)}
        </div>
      </div>

      {/* Category (table) w/ amounts */}
      <div className="flex flex-col my-2 h-[700px] overflow-y-auto border-2 border-black rounded-md">
        <table className="relative table-auto">
          <thead>
            <tr>
              <th className="sticky top-0 bg-white p-2"></th>
              <th className="text-left sticky top-0 bg-white p-2 text-lg">
                Category
              </th>
              <th className="text-right sticky top-0 bg-white p-2 text-lg">
                Add/Remove
              </th>
              <th className="text-center sticky top-0 bg-white p-2 text-lg">
                # of Months
              </th>
              <th className="text-center sticky top-0 bg-white p-2 text-lg">
                Total Amount
              </th>
            </tr>
          </thead>

          <tbody>
            {setupCategories.map((item, i) => {
              return (
                <SetupBudgetListItem
                  key={i}
                  isParent={item.isParent}
                  isExpanded={item.isExpanded}
                  category={item}
                  toggleCategory={toggleCategory}
                  addMonthToCategory={addMonthToCategory}
                  removeMonthFromCategory={removeMonthFromCategory}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Save to YNAB Button */}
      <button
        type="button"
        className="sticky bottom-0 mt-5 p-3 w-full rounded-md bg-gray-300 hover:bg-blue-500 hover:text-white font-bold"
        onClick={saveToYNAB}
      >
        Save to YNAB
      </button>
    </div>
  );
}

export default SetupBudgetModal;
