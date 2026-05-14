import React from "react";
import assets from "../assets/assets";
import { useNavigate, Link } from "react-router-dom";
import { CirclePlus } from "lucide-react";
import MenuItems from "./MenuItems";

const SideBar = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  return (
    <div
      className={`w-60 xl:w-72 bg-white p-4 border-r border-gray-200 flex flex-col justify-between items-center max-sm:absolute top-0 bottom-0 z-20 ${
        sidebarOpen ? "translate-x-0" : "max-sm:-translate-x-full"
      } transition-all duration-300 ease-in-out`}
    >
      <div className="w-full">
        <div
          className="flex items-center my-2 gap-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img src={assets.logo} alt="Logo" className="w-25" />
          <p className="text-xl font-bold text-indigo-500">Connectify</p>
        </div>
        <hr className="border-gray-200 mb-8" />
        <MenuItems setSidebarOpen={setSidebarOpen} />

        <Link
          to="/create-post"
          className="flex items-center justify-center gap-2 py-2 mt-6 mx-6 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo--700 hover:to-purple-800 active:scale-95 transition text-white cursor-pointer"
        >
          <CirclePlus className="w-5 h-5" />
          Create Post
        </Link>
      </div>
    </div>
  );
};

export default SideBar;
