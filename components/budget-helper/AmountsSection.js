import React from "react";
import PencilAltIcon from "@heroicons/react/outline/PencilAltIcon";
import CheckIcon from "@heroicons/react/outline/CheckIcon";

import { getMoneyString } from "../../utils";
import NumberInput from "../util/NumberInput";

function AmountsSection({
  payFrequency,
  setEditingFrequency,
  monthlyAmount,
  setMonthlyAmount,
  grandTotal,
  editingMonthlyAmount,
  setEditingMonthlyAmount,
  updateMonthlyIncome,
}) {
  console.log("GRAND TOTAL", grandTotal);

  const amountRemaining = monthlyAmount - grandTotal;
  const percentUsed =
    monthlyAmount == 0 ? 0 : (grandTotal / monthlyAmount) * 100;

  return (
    <div className="flex justify-between">
      <div className={`flex w-full items-center justify-evenly`}>
        {/* Pay Frequency */}
        <div className="text-center">
          <div className="font-semibold text-md font-raleway uppercase">
            Pay Frequency
          </div>
          <div className="flex items-center">
            <div className="font-bold text-2xl">{payFrequency}</div>
            <PencilAltIcon
              className="h-7 ml-1 cursor-pointer hover:text-gray-400"
              onClick={() => setEditingFrequency(true)}
            />
          </div>
        </div>

        {/* Monthly Income */}
        <div className="flex flex-col items-center">
          <div className="font-semibold text-md font-raleway uppercase">
            Monthly Income
          </div>
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
                <div className="font-bold text-3xl text-green-600">
                  {getMoneyString(monthlyAmount)}
                </div>
                <PencilAltIcon
                  className="h-7 ml-1 cursor-pointer hover:text-green-600"
                  onClick={() => setEditingMonthlyAmount(true)}
                />
              </>
            )}
          </div>
        </div>

        {/* Amount Remaining */}
        <div className="text-center">
          <div className="font-semibold text-md font-raleway uppercase">
            Amount Remaining
          </div>
          <div
            className={`font-bold text-3xl ${
              amountRemaining.toFixed(0) < 0 && "text-red-500"
            }`}
          >
            {getMoneyString(amountRemaining)}
          </div>
        </div>

        {/* Amount Used */}
        <div className="text-center">
          <div className="font-semibold text-md font-raleway uppercase">
            Amount Used
          </div>
          <div className="font-bold text-3xl">{getMoneyString(grandTotal)}</div>
        </div>

        {/* % Used */}
        <div className="text-center">
          <div className="font-semibold  text-md font-raleway uppercase">
            % Used
          </div>
          <div className="font-bold text-3xl">
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
