import React, { useState } from "react";
import QuestionMarkCircleIcon from "@heroicons/react/outline/QuestionMarkCircleIcon";
import MyModal from "./MyModal";

function MyHelpIcon({ sizeInPx, helpModal, isDarker }) {
  const [currModal, setCurrModal] = useState(null);

  return (
    <>
      <QuestionMarkCircleIcon
        height={sizeInPx}
        width={sizeInPx}
        className={`mr-1 ${
          isDarker ? "text-gray-400" : "text-gray-300"
        } hover:text-black hover:cursor-pointer`}
        onClick={() => setCurrModal(helpModal)}
      />

      <MyModal currModal={currModal} setCurrModal={setCurrModal} />
    </>
  );
}

export default MyHelpIcon;
