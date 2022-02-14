import React from "react";
import Slider from "react-input-slider";

function MySlider({ start, onChange }) {
  return (
    <>
      {" "}
      <Slider
        axis="x"
        x={start}
        styles={{
          track: {
            backgroundColor: "gray",
            width: "350px",
          },
        }}
        onChange={(x) => {
          let newPos = {
            x: x.x,
          };

          onChange(newPos.x);
        }}
      />
    </>
  );
}

export default MySlider;
