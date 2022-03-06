import React from "react";
import Switch from "react-toggle-switch";

function MyToggleSwitch({ label, checked, onClick }) {
  return (
    <div className="flex flex-col items-center">
      <label className="font-medium text-sm mb-1">{label}</label>
      <Switch onClick={onClick} on={checked} />
    </div>
  );
}

export default MyToggleSwitch;
