import ChartInfo from "./ChartInfo";
import ChartSection from "./ChartSection";

function Results(props) {
  return (
    <div>
      <div className="flex min-h-full max-h-[650px]">
        <ChartSection {...props} />
        <ChartInfo {...props} />
      </div>
    </div>
  );
}

export default Results;
