import PencilAltIcon from "@heroicons/react/outline/PencilAltIcon";
import CheckIcon from "@heroicons/react/outline/CheckIcon";
import { useState } from "react";
import data from "../../data.json";
import NumberInput from "../util/NumberInput";
import MyModal from "../util/MyModal";

function SixMonthInfo(props) {
  const [monthsAhead, setMonthsAhead] = useState(
    props.sixMonthDetails.monthsAheadTarget
  );
  const [editingTarget, setEditingTarget] = useState(false);
  const [currModal, setCurrModal] = useState(null);

  const updateMonthsAheadTarget = (newVal) => {
    let newSixMoDt = { ...props.sixMonthDetails };
    newSixMoDt.monthsAheadTarget = newVal;
    newSixMoDt.shouldSave = true;
    props.setSixMonthDetails(newSixMoDt);

    setEditingTarget(false);
  };

  return (
    <>
      <div className="text-right">
        <div
          className="hover:underline hover:cursor-pointer"
          onClick={() => {
            setCurrModal(data.Modals.SETUP_BUDGET);
          }}
        >
          Setup Starting Budget
        </div>
      </div>

      <div className="flex flex-col justify-around items-center h-full">
        <div className="font-bold text-5xl underline">Six Month Info</div>

        <div className="mt-10 flex flex-col items-center">
          <div className="text-3xl font-bold">Months Ahead Target</div>

          {editingTarget ? (
            <div className="flex items-center mt-3">
              <NumberInput
                value={monthsAhead}
                setValue={setMonthsAhead}
                onEnter={updateMonthsAheadTarget}
              />
              <CheckIcon
                className="h-8 cursor-pointer ml-1 hover:text-green-600"
                onClick={updateMonthsAheadTarget}
              />
            </div>
          ) : (
            <div className="flex justify-evenly items-center">
              <div className="text-3xl mr-3">{monthsAhead}</div>
              <div>
                <PencilAltIcon
                  className="h-8 cursor-pointer hover:text-gray-500"
                  onClick={() => {
                    setEditingTarget(!editingTarget);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-col items-center">
          <div className="text-3xl font-bold">Categories w/ Target Met</div>
          <div className="text-3xl">
            {props.sixMonthDetails && props.sixMonthDetails.categories.length
              ? props.sixMonthDetails.targetMetCount +
                " / " +
                props.sixMonthDetails.categories.length +
                " (" +
                (
                  (props.sixMonthDetails.targetMetCount /
                    props.sixMonthDetails.categories.length) *
                  100
                ).toFixed(0) +
                "%)"
              : "N/A"}
          </div>
        </div>
      </div>

      <MyModal currModal={currModal} setCurrModal={setCurrModal} {...props} />
    </>
  );
}

export default SixMonthInfo;
