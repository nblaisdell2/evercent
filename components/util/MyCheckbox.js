import React from "react";

function MyCheckbox({ label, checked, onClick }) {
  return (
    <div className="cursor-pointer" onClick={onClick}>
      {" "}
      <input type="checkbox" checked={checked} onChange={onClick} />
      {"  "}
      <span>{label}</span>
    </div>
  );
}

export default MyCheckbox;
