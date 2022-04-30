import MinusCircleIcon from "@heroicons/react/outline/MinusCircleIcon";
import CheckIcon from "@heroicons/react/outline/CheckIcon";
import ArrowLeftIcon from "@heroicons/react/outline/ArrowLeftIcon";
import ClockIcon from "@heroicons/react/outline/ClockIcon";
import {
  getAmountByFrequency,
  getCategoryListItemsWithMonths,
  getGrandTotal,
} from "../../evercent";
import { treatAsUTC } from "../../utils";
import { useState } from "react";

function AutomationReviewModal(props) {
  const [selectedCatIDs, setSelectedCatIDs] = useState([]);

  const toggleShowAmountsPerCategory = (category) => {
    let newCatIDs = [...selectedCatIDs];
    if (newCatIDs.includes(category.id)) {
      newCatIDs = newCatIDs.filter((x) => x !== category.id);
    } else {
      newCatIDs.push(category.id);
    }
    setSelectedCatIDs(newCatIDs);
  };

  let myListItems = getCategoryListItemsWithMonths(
    props.userCategoryList,
    props.userDetails.MonthlyAmount,
    props.userDetails.PayFrequency,
    props.userDetails.NextPaydate
  );

  let freq = props.tempAutoRuns[0].Frequency;
  let grandTotal = getGrandTotal(props.userCategoryList);
  grandTotal = getAmountByFrequency(grandTotal, freq);

  console.log("ListItems w/ Months", myListItems);

  return (
    <div className="h-[600px] flex flex-col mt-1 m-5 relative">
      {/* Header */}
      <div className="text-center text-3xl font-bold">
        Budget Automation Review
      </div>

      {/* Next Auto Runs List */}
      <div className="flex flex-col mt-5">
        <div className="flex justify-between mb-1">
          <div>
            <div
              onClick={() => {
                props.setShowReview(false);
              }}
              className="font-bold flex p-1 hover:underline hover:cursor-pointer hover:bg-blue-400 hover:text-white hover:rounded-md"
            >
              <ArrowLeftIcon className="h-6 w-6 mr-1" />
              <p>Edit Schedule</p>
            </div>
          </div>

          <div>
            <div className="text-center font-bold text-xl uppercase">
              Next Auto Run(s)
            </div>
          </div>

          <div>
            <div
              onClick={() => {
                if (props.pastAutoRuns.length > 0) {
                  props.setShowPastRuns(true);
                }
              }}
              className={`font-bold flex p-1 hover:underline ${
                props.pastAutoRuns.length == 0
                  ? "hover:bg-gray-400 hover:cursor-not-allowed"
                  : "hover:bg-blue-400 hover:cursor-pointer"
              } hover:text-white hover:rounded-md`}
            >
              <ClockIcon className="h-6 w-6 mr-1" />
              <p>See Past Runs</p>
            </div>
          </div>
        </div>

        <div className="h-[120px] w-full overflow-y-auto flex flex-col items-center border-2 border-black rounded-md">
          {props.tempAutoRuns?.map((v, i) => {
            return (
              <div key={i} className={`${i == 0 ? "font-bold" : ""} text-lg`}>
                {(props.scheduleChanged
                  ? new Date(v.RunTime)
                  : treatAsUTC(new Date(v.RunTime))
                )
                  .toLocaleString()
                  .replace(",", " @")}
              </div>
            );
          })}
        </div>
      </div>

      {/* Total & Category Amounts */}
      <div className="my-3">
        <div className="font-bold text-xl uppercase text-center">
          Amounts Posted to YNAB on{" "}
          {props.tempAutoRuns &&
            (props.scheduleChanged
              ? new Date(props.tempAutoRuns[0].RunTime)
              : treatAsUTC(new Date(props.tempAutoRuns[0].RunTime))
            )
              .toLocaleString()
              .replace(",", " @")}
        </div>
        <div className="h-[290px] overflow-y-auto border-2 border-black rounded-md p-2">
          <div className="flex justify-between border-b-2 border-black">
            <div className="font-bold text-xl">Total</div>
            <div className="font-bold text-2xl text-green-500">
              {"$" + grandTotal.toFixed(0)}
            </div>
          </div>
          {myListItems.map((v, i) => {
            if (v.month && !selectedCatIDs.includes(v.id)) {
              return <></>;
            }
            return (
              <div
                key={v.id + i.toString()}
                className={`flex justify-between ${
                  v.isParent ? "" : " hover:bg-gray-300 hover:cursor-pointer"
                }`}
                onClick={() => toggleShowAmountsPerCategory(v)}
              >
                {!v.month ? (
                  <>
                    <div className={`${v.isParent ? "font-bold" : "ml-5"}`}>
                      {v.category}
                    </div>
                    <div className={`${v.isParent ? "font-bold" : ""}`}>
                      {"$" + getAmountByFrequency(v.amountNum, freq).toFixed(2)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ml-10 italic text-gray-400">{v.month}</div>
                    <div className="italic text-xs flex items-center">
                      {"$" + v.amountNum.toFixed(2)}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Buttons */}
      <div className="h-full w-full sticky bottom-0 flex justify-between items-end">
        <button
          onClick={() => {
            props.saveAutomationRuns();
          }}
          className="rounded-md p-3 bg-gray-300 hover:bg-blue-400 hover:text-white font-bold flex flex-grow items-center justify-center mx-1 text-lg"
        >
          <CheckIcon className="h-6 w-6 text-green-600 mr-1" />
          <p>Save and Exit</p>
        </button>

        {props.userDetails.NextAutomatedRun && (
          <button
            onClick={() => {
              props.deleteAutomationRuns();
            }}
            className="rounded-md p-3 bg-gray-300 hover:bg-blue-400 hover:text-white font-bold flex flex-grow items-center justify-center mx-1 text-lg"
          >
            <MinusCircleIcon className="h-6 w-6 text-red-600 mr-1" />
            <p>Cancel Automation</p>
          </button>
        )}
      </div>
    </div>
  );
}

export default AutomationReviewModal;
