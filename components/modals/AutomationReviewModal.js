import MinusCircleIcon from "@heroicons/react/outline/MinusCircleIcon";
import CheckIcon from "@heroicons/react/outline/CheckIcon";
import ArrowLeftIcon from "@heroicons/react/outline/ArrowLeftIcon";
import {
  getAmountByFrequency,
  getCategoryListItems,
  getGrandTotal,
} from "../../evercent";
import { treatAsUTC } from "../../utils";

function AutomationReviewModal(props) {
  let myListItems = getCategoryListItems(
    props.userCategoryList,
    props.userDetails.MonthlyAmount
  ).filter((x) => x.amountNum > 0);

  let freq = props.tempAutoRuns[0].Frequency;
  let grandTotal = getGrandTotal(props.userCategoryList);
  grandTotal = getAmountByFrequency(grandTotal, freq);

  return (
    <div className="h-[600px] flex flex-col mt-1 m-5 relative">
      {/* Header */}
      <div className="text-center text-3xl font-bold">
        Budget Automation Review
      </div>

      {/* Next Auto Runs List */}
      <div className="flex flex-col mt-5">
        <div className="">
          <div
            onClick={() => {
              props.setShowReview(false);
            }}
            className="float-left font-bold flex hover:underline hover:cursor-pointer"
          >
            <ArrowLeftIcon className="h-6 w-6 mr-1" />
            <p>Edit Schedule</p>
          </div>
          <div className="text-center font-bold text-xl uppercase mr-32">
            Next Auto Run(s)
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
      <div className="mt-5">
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
            let amtNum = getAmountByFrequency(v.amountNum, freq);

            return (
              <div
                key={i}
                className={`flex justify-between ${
                  v.isParent ? "" : " hover:bg-gray-300"
                }`}
              >
                <div className={`${v.isParent ? "font-bold" : "ml-5"}`}>
                  {v.category}
                </div>
                <div className={`${v.isParent ? "font-bold" : ""}`}>
                  {"$" + amtNum.toFixed(2)}
                </div>
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
