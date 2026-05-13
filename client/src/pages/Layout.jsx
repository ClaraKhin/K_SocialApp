import { useState } from "react";
import SideBar from "../components/SideBar";
import { Outlet } from "react-router-dom";
import { X, Menu } from "lucide-react";
import { dummyUserData } from "../assets/assets";

const Layout = () => {
  const user = dummyUserData; // Replace with actual user data from Clerk

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return user ? (
    <div className="w-full min-h-screen flex">
      <SideBar />
      <div className="flex-1 bg-slate-50 ">
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
    <h1>Loading...</h1>
  );
};

export default Layout;
