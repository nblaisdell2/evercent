import React from "react";

function MyRadioButton({ label, value, onClick }) {
  return (
    <div className="mr-5" onClick={() => onClick(label)}>
      <input type="radio" checked={value == label} onChange={() => {}} />
      <label className="ml-1 hover:cursor-pointer">{label}</label>
    </div>
  );
}

export default MyRadioButton;
