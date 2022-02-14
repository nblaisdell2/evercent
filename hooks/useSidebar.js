import { useEffect, useState } from "react";

function useSidebar(startOpen) {
  const [sidebarOpen, setSidebarOpen] = useState(startOpen);
  const [sidebarStyles, setSidebarStyles] = useState({
    sidebar: {
      background: "white",
    },
    root: {
      zIndex: -1,
    },
  });

  useEffect(() => {
    let newStyles = { ...sidebarStyles };
    if (sidebarOpen) {
      newStyles.root.zIndex = 10;
    } else {
      newStyles.root.zIndex = -1;
    }
    setSidebarStyles(newStyles);
  }, [sidebarOpen]);

  return [sidebarOpen, setSidebarOpen, sidebarStyles];
}

export default useSidebar;
