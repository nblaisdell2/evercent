import React from "react";
import DateTimePicker from "../util/DateTimePicker";
import MyRadioButton from "../util/MyRadioButton";

function EditFrequency({
  payFrequency,
  setPayFrequency,
  nextPaydate,
  setNextPaydate,
  updateFrequency,
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex items-center">
        <div className="text-center">
          <div className="uppercase underline text-lg font-semibold">
            Pay Frequency
          </div>
          <div className="flex flex-col mt-1">
            <div className="flex">
              <MyRadioButton
                label="Every Week"
                value={payFrequency}
                onClick={setPayFrequency}
              />
              <MyRadioButton
                label="Every 2 Weeks"
                value={payFrequency}
                onClick={setPayFrequency}
              />
              <MyRadioButton
                label="Monthly"
                value={payFrequency}
                onClick={setPayFrequency}
              />
            </div>
          </div>
        </div>

        <div className="text-center ml-5">
          <div className="uppercase underline text-lg font-semibold">
            Next Paydate
          </div>
          <div>
            <DateTimePicker
              autoDate={nextPaydate}
              setAutoDate={setNextPaydate}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="font-bold p-3 ml-5 mt-8 w-32 rounded-md hover:underline bg-gray-300 hover:bg-blue-300 hover:text-white"
        onClick={() => {
          updateFrequency();
        }}
      >
        Save
      </button>
    </div>
  );
}

export default EditFrequency;
