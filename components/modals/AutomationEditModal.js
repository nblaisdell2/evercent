import DateTimePicker from "../util/DateTimePicker";
import MyDropdown from "../util/MyDropdown";
import MyRadioButton from "../util/MyRadioButton";

function AutomationEditModal(props) {
  // TODO: The DateTimePicker in the AutomationEditModal needs to only allow for DateTimes
  //       that haven't already passed. Currently, I'm able to select a date/time in the past.

  return (
    <div className="h-[600px] flex flex-col m-5 relative">
      <div className="text-center text-2xl">Budget Automation Setup</div>

      <div className="flex justify-around items-center mt-5">
        <MyRadioButton
          label={"One-Time"}
          value={props.setupType}
          onClick={props.setSetupType}
        />
        <MyRadioButton
          label={"Scheduled"}
          value={props.setupType}
          onClick={props.setSetupType}
        />
      </div>

      {/* Results (DateTimePicker for One-Time / Frequency checkboxes for Scheduled) */}
      <div className=" h-[450px] overflow-y-auto">
        <div className="flex justify-around mt-5">
          {props.setupType == "One-Time" && (
            <div className="text-center">
              <div className="uppercase underline text-lg font-semibold">
                Choose a Day
              </div>
              <div>
                <DateTimePicker
                  autoDate={props.autoDate}
                  setAutoDate={props.setAutoDate}
                />
              </div>
            </div>
          )}

          <div className="text-center">
            <div className="uppercase underline text-lg font-semibold">
              Choose a Time
            </div>

            <div className="flex justify-center">
              <div className="p-2 bg-white rounded-lg border-2 border-blue-400">
                <div className="flex">
                  <MyDropdown
                    value={props.timeOfDay}
                    options={props.availHours}
                    onChange={props.setTimeOfDay}
                    className="bg-transparent text-xl text-center appearance-none outline-none hover:underline hover:cursor-pointer"
                  />
                  <MyDropdown
                    value={props.amPM}
                    options={props.availAMPM}
                    onChange={props.setAmPm}
                    className="bg-transparent text-xl text-center appearance-none outline-none hover:underline hover:cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {props.setupType &&
        ((props.timeOfDay && props.amPM && props.setupType == "Scheduled") ||
          (props.autoDate &&
            props.timeOfDay &&
            props.amPM &&
            props.setupType == "One-Time")) && (
          <div>
            <button
              onClick={() => {
                props.generateAutoRunList();
                props.setShowReview(true);
              }}
              className="sticky bottom-0 mt-5 p-3 w-full rounded-md bg-gray-300 hover:bg-blue-500 hover:text-white font-bold"
            >
              Review
            </button>
          </div>
        )}
    </div>
  );
}

export default AutomationEditModal;
