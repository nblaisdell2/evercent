import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parseJSON } from "date-fns";

function DateTimePicker({ autoDate, setAutoDate }) {
  return (
    <div className="p-2 outline-none bg-white rounded-lg border-2 border-blue-400 inline-block">
      <DatePicker
        selected={parseJSON(autoDate)}
        onChange={(date) => setAutoDate(date)}
        minDate={new Date()}
        className="outline-none"
      />
    </div>
  );
}

export default DateTimePicker;
