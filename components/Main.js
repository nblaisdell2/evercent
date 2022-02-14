import React, { useState } from "react";
import Results from "./layout/Results";
import Widgets from "./layout/Widgets";

function Main(props) {
  const [widget, setWidget] = useState("Budget Chart");

  return (
    <div>
      <Widgets name={widget} setWidget={setWidget} />
      <Results name={widget} {...props} />
    </div>
  );
}

export default Main;
