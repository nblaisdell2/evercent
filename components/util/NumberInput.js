import { getDefaultNumber } from "../../utils";

function NumberInput({ value, setValue, setValue2, onEnter, className }) {
  return (
    <input
      // className={!className ? "text-right p-2 border border-black rounded-md" : className}
      className={className + " p-2 border border-black rounded-md"}
      type="numeric"
      value={value}
      onChange={(e) => {
        if (setValue) {
          console.log(
            "NumberInput: Setting value to " + getDefaultNumber(e.target.value)
          );
          setValue(getDefaultNumber(e.target.value));
        } else if (setValue2) {
          setValue2(e.target.value);
        }
      }}
      onKeyDown={(e) => {
        if (onEnter && e.key === "Enter") {
          onEnter(value);
        }
      }}
      onClick={(e) => e.target.select()}
    />
  );
}

export default NumberInput;
