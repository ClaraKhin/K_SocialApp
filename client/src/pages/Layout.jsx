import { useState } from "react";
import SideBar from "../components/SideBar";
import { Outlet } from "react-router-dom";
import { X, Menu } from "lucide-react";
// import { dummyUserData } from "../assets/assets";
import { useSelector } from "react-redux";
import Loading from "../components/Loading";

const Layout = () => {
  const user = useSelector((state) => state.user.value);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return user ? (
    <div className="w-full min-h-screen flex">
      <SideBar isSidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 bg-[#eeeeee] ">
        <Outlet />
      </div>
      {sidebarOpen ? (
        <X
          className="absolute top-3 right-3 p-2 z-100 bg-white rounded-md shadow w-10 h-10 text-gray-600 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : (
        <Menu
          className="absolute top-3 right-3 p-2 z-100 bg-white rounded-md shadow w-10 h-10 text-gray-600 sm:hidden"
          onClick={() => setSidebarOpen(true)}
        />
      )}
    </div>
  ) : (
    <Loading />
  );
};

export default Layout;
