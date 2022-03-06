import React from "react";

function MyDropdown({ value, options, onChange, disabled, className }) {
  return (
    <div>
      <select
        disabled={disabled}
        className={!className ? "border border-black" : className}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        value={value}
      >
        {options.map((x, i) => {
          return (
            <option key={i} value={x}>
              {x}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export default MyDropdown;
