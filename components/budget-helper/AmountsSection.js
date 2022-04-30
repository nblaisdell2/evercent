import React from "react";
import PencilAltIcon from "@heroicons/react/outline/PencilAltIcon";
import CheckIcon from "@heroicons/react/outline/CheckIcon";

import { getMoneyString } from "../../utils";
import NumberInput from "../util/NumberInput";
import MyHelpIcon from "../util/MyHelpIcon";
import data from "../../data.json";

function AmountsSection({
  payFrequency,
  setEditingFrequency,
  monthlyAmount,
  setMonthlyAmount,
  grandTotal,
  editingMonthlyAmount,
  setEditingMonthlyAmount,
  updateMonthlyIncome,
  forHelp,
}) {
  console.log("GRAND TOTAL", grandTotal);

  const amountRemaining = monthlyAmount - grandTotal;
  const percentUsed =
    monthlyAmount == 0 ? 0 : (grandTotal / monthlyAmount) * 100;

  const getAmountHeader = (headerName) => {
    let modal = "";
    switch (headerName) {
      case "Pay Frequency":
        modal = data.Modals.HELP_AMTS_PAY_FREQ;
        break;
      case "Monthly Income":
        modal = data.Modals.HELP_AMTS_MONTHLY_INCOME;
        break;
      case "Amount Remaining":
        modal = data.Modals.HELP_AMTS_AMOUNT_REMAINING;
        break;
      case "Amount Used":
        modal = data.Modals.HELP_AMTS_AMOUNT_USED;
        break;
      case "% Used":
        modal = data.Modals.HELP_AMTS_PERCENT_USED;
        break;
      default:
        modal = "";
        break;
    }
    return (
      <div className="font-semibold text-md font-raleway uppercase flex justify-center items-center">
        {forHelp == null && <MyHelpIcon sizeInPx={25} helpModal={modal} />}
        <div>{headerName}</div>
      </div>
    );
  };

  return (
    <div className="flex justify-between">
      <div className={`flex w-full items-center justify-evenly`}>
        {/* Pay Frequency */}
        <div
          className={`text-center min-w-[100px] ${
            forHelp == "Pay Frequency" && "border-2 border-red-500 rounded-md"
          }`}
        >
          {getAmountHeader("Pay Frequency")}
          <div className="flex items-center">
            <div className="font-bold text-2xl">{payFrequency}</div>
            {forHelp == null && (
              <PencilAltIcon
                className="h-7 ml-1 cursor-pointer hover:text-gray-400"
                onClick={() => setEditingFrequency(true)}
              />
            )}
          </div>
        </div>

        {/* Monthly Income */}
        <div
          className={`text-center min-w-[100px] ${
            forHelp == "Monthly Income" && "border-2 border-red-500 rounded-md"
          }`}
        >
          {getAmountHeader("Monthly Income")}
          <div className="flex justify-center items-center">
            {editingMonthlyAmount ? (
              <>
                <NumberInput
                  value={monthlyAmount}
                  setValue={setMonthlyAmount}
                  onEnter={updateMonthlyIncome}
                />

                <CheckIcon
                  className="h-8 cursor-pointer ml-1 hover:text-green-600"
                  onClick={() => {
                    updateMonthlyIncome(monthlyAmount);
                  }}
                />
              </>
            ) : (
              <>
                <div
                  className={`font-bold ${
                    forHelp != null ? "text-2xl" : "text-3xl"
                  } text-green-600`}
                >
                  {getMoneyString(monthlyAmount)}
                </div>
                {forHelp == null && (
                  <PencilAltIcon
                    className="h-7 ml-1 cursor-pointer hover:text-green-600"
                    onClick={() => setEditingMonthlyAmount(true)}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Amount Remaining */}
        <div
          className={`text-center min-w-[100px] ${
            forHelp == "Amount Remaining" &&
            "border-2 border-red-500 rounded-md"
          }`}
        >
          {getAmountHeader("Amount Remaining")}
          <div
            className={`font-bold ${
              forHelp != null ? "text-2xl" : "text-3xl"
            } ${amountRemaining.toFixed(0) < 0 && "text-red-500"}`}
          >
            {getMoneyString(amountRemaining)}
          </div>
        </div>

        {/* Amount Used */}
        <div
          className={`text-center min-w-[100px] ${
            forHelp == "Amount Used" && "border-2 border-red-500 rounded-md"
          }`}
        >
          {getAmountHeader("Amount Used")}
          <div
            className={`font-bold ${forHelp != null ? "text-2xl" : "text-3xl"}`}
          >
            {getMoneyString(grandTotal)}
          </div>
        </div>

        {/* % Used */}
        <div
          className={`text-center min-w-[100px] ${
            forHelp == "% Used" && "border-2 border-red-500 rounded-md"
          }`}
        >
          {getAmountHeader("% Used")}
          <div
            className={`font-bold ${forHelp != null ? "text-2xl" : "text-3xl"}`}
          >
            {percentUsed.toFixed(0) == "100" && monthlyAmount - grandTotal > 0
              ? "99%"
              : percentUsed.toFixed(0) + "%"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AmountsSection;
