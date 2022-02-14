import { useState, useEffect } from "react";
import Modal from "react-modal";

import AutomationModal from "../modals/AutomationModal";
import CategoryModal from "../modals/CategoryModal";
import SetupBudgetModal from "../modals/SetupBudgetModal";

import XIcon from "@heroicons/react/outline/XIcon";

import data from "../../data.json";

const customStyles = {
  content: {
    top: "50%",
    left: "50%",
    right: "65%",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
  },
};

Modal.setAppElement("#__next");
Modal.defaultStyles.overlay.backgroundColor = "rgba(0, 0, 0, 0.7)";

function MyModal(props) {
  const [modalIsOpen, setIsOpen] = useState(false);

  const closeModal = () => {
    props.setCurrModal(null);
  };

  const getModalComponent = (currModal) => {
    switch (currModal) {
      case data.Modals.YNAB_CATEGORIES:
        return <CategoryModal closeModal={closeModal} {...props} />;
      case data.Modals.AUTOMATION:
        return <AutomationModal closeModal={closeModal} {...props} />;
      case data.Modals.SETUP_BUDGET:
        return <SetupBudgetModal closeModal={closeModal} {...props} />;
    }
  };

  useEffect(() => {
    setIsOpen(props.currModal != null);
  }, [props.currModal]);

  return (
    <Modal
      isOpen={modalIsOpen}
      onAfterOpen={() => {}}
      onRequestClose={closeModal}
      style={customStyles}
      closeTimeoutMS={500}
      contentLabel="Example Modal"
      className={`${props.currModal == null ? "hidden" : ""}`}
    >
      <div className="flex justify-end" onClick={closeModal}>
        <XIcon className="h-[30px] w-[30px] hover:cursor-pointer hover:text-red-500" />
      </div>

      <style jsx global>{`
        .ReactModal__Overlay {
          opacity: 0;
          transform: translateX(0px);
          transition: all 500ms ease-in-out;
        }

        .ReactModal__Overlay--after-open {
          opacity: 1;
          transform: translateX(0px);
        }

        .ReactModal__Overlay--before-close {
          opacity: 0;
          transform: translateX(0px);
        }
      `}</style>

      {getModalComponent(props.currModal)}
    </Modal>
  );
}

export default MyModal;
