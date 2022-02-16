import Image from "next/image";
import Sidebar from "react-sidebar";
import MySidebar from "../util/MySidebar";
import useSidebar from "../../hooks/useSidebar";

function Header({ isConnectedToYNAB }) {
  const [sidebarOpen, setSidebarOpen, sidebarStyles] = useSidebar(false);

  return (
    <header className="flex justify-end bg-blue-900 p-1 pr-6">
      <div
        className="hover:cursor-pointer flex items-center"
        onClick={() => setSidebarOpen(true)}
      >
        <h2 className="mr-2 text-3xl font-cinzel text-white">EverCent</h2>

        <Image
          src="/evercent_logo.png"
          className="object-contain"
          width={50}
          height={50}
          alt="My Logo"
        />
      </div>

      <Sidebar
        sidebar={<MySidebar isConnectedToYNAB={isConnectedToYNAB} />}
        children={<div></div>}
        open={sidebarOpen}
        onSetOpen={setSidebarOpen}
        styles={sidebarStyles}
        pullRight={true}
      />
    </header>
  );
}

export default Header;
