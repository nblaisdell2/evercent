import { useEffect, useState } from "react";
import AutomationEditModal from "./AutomationEditModal";
import AutomationReviewModal from "./AutomationReviewModal";
import { advanceDateByFrequency, getFutureAutoDateList } from "../../evercent";
import { treatAsUTC } from "../../utils";
import AutomationPastRunsModal from "./AutomationPastRunsModal";

function AutomationModal(props) {
  const [firstLoad, setFirstLoad] = useState(true);
  const [scheduleChanged, setScheduleChanged] = useState(false);

  const [showReview, setShowReview] = useState(
    props.userDetails.NextAutomatedRun ? true : false
  );
  const [showPastRuns, setShowPastRuns] = useState(false);

  const [setupType, setSetupType] = useState(
    props.NextAutoRuns && props.NextAutoRuns[0]
      ? props.NextAutoRuns[0].Frequency == "One-Time"
        ? "One-Time"
        : "Scheduled"
      : "One-Time"
  );
  const [timeOfDay, setTimeOfDay] = useState("8");
  const [amPM, setAmPm] = useState("AM");
  const [availHours, setAvailHours] = useState([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  ]);
  const [availAMPM, setAvailAMPM] = useState(["AM", "PM"]);
  const [autoDate, setAutoDate] = useState(new Date());

  const [tempAutoRuns, setTempAutoRuns] = useState(props.nextAutoRuns);

  const saveAutomationRuns = () => {
    if (scheduleChanged) {
      let newTempRuns = [...tempAutoRuns];
      newTempRuns[0].shouldSave = true;

      props.setNextAutoRuns(newTempRuns);
    } else {
      props.closeModal();
    }
  };

  const deleteAutomationRuns = () => {
    let newTempRuns = [{ shouldSave: true }];
    props.setNextAutoRuns(newTempRuns);
  };

  const generateAutoRunList = () => {
    let numIters = 0; // How many auto runs we want to generate
    let dtWithTime = null; // The starting date/time

    // Based on the setupType, set the number of runs we want to generate
    // and the starting date/time
    if (setupType == "One-Time") {
      // If it's a "One-Time" run, only generate a single run and
      // start at the exact time that the user entered using the
      // DateTimePicker.
      numIters = 1;
      dtWithTime = new Date(autoDate);
    } else {
      // Otherwise, we should generate a list of the next 10 auto runs
      // based on the user's "setupType".
      // Since we're reading a date from the database, we need to treat it as UTC,
      // rather than normal like above
      numIters = 10;
      dtWithTime = new Date(props.userDetails.NextPaydate);
    }

    // Then, normalize the date by removing the minute, second, millisecond portions
    // and setting the hours based on the "timeOfDay" & "amPM" values
    let numHours = parseInt(timeOfDay) + (amPM == "AM" ? 0 : 12);
    dtWithTime.setHours(numHours, 0, 0, 0);
    setAutoDate(dtWithTime);

    // Then, in case they choose a time that has already passed, we need to advance
    // the starting point by a single step, based on the user's Frequency, so we
    // don't start on a day that has already gone by.
    if (new Date() > dtWithTime) {
      dtWithTime = advanceDateByFrequency(
        dtWithTime,
        props.userDetails.PayFrequency
      );
    }

    // Lastly, generate the auto run list with our starting point and the number of runs
    // we want to generate, and then set the tempAutoRuns state.
    let newAutoRunList = getFutureAutoDateList(
      dtWithTime,
      props.userDetails.PayFrequency,
      numIters
    );
    // console.log(
    //   "useEffect for showReview - what is newAutoRunList?",
    //   newAutoRunList
    // );
    setTempAutoRuns(newAutoRunList);
  };

  useEffect(() => {
    if (firstLoad) {
      setFirstLoad(false);
    } else if (!scheduleChanged) {
      setScheduleChanged(true);
    }
  }, [showReview]);

  if (showPastRuns) {
    return (
      <AutomationPastRunsModal scheduleChanged={scheduleChanged} {...props} />
    );
  } else if (showReview) {
    return (
      <AutomationReviewModal
        tempAutoRuns={tempAutoRuns}
        scheduleChanged={scheduleChanged}
        setShowReview={setShowReview}
        setShowPastRuns={setShowPastRuns}
        saveAutomationRuns={saveAutomationRuns}
        deleteAutomationRuns={deleteAutomationRuns}
        {...props}
      />
    );
  } else {
    return (
      <AutomationEditModal
        setupType={setupType}
        setSetupType={setSetupType}
        autoDate={autoDate}
        setAutoDate={setAutoDate}
        timeOfDay={timeOfDay}
        setTimeOfDay={setTimeOfDay}
        amPM={amPM}
        setAmPm={setAmPm}
        availHours={availHours}
        availAMPM={availAMPM}
        setShowReview={setShowReview}
        generateAutoRunList={generateAutoRunList}
        {...props}
      />
    );
  }
}

export default AutomationModal;
