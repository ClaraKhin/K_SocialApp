import React from "react";
import { dummyUserData } from "../assets/assets";
import assets from "../assets/assets";
import { useNavigate, Link } from "react-router-dom";
import { CirclePlus, LogOut } from "lucide-react";
import MenuItems from "./MenuItems";
import { UserButton, useClerk } from "@clerk/react";

const SideBar = ({ sidebarOpen, isSidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const user = dummyUserData;
  const { signOut } = useClerk();
  const isOpen = sidebarOpen ?? isSidebarOpen;
  return (
    <div
      className={`w-60 xl:w-72 shrink-0 bg-white p-4 border-r border-gray-200 flex flex-col justify-between items-center overflow-y-auto sm:sticky sm:top-0 sm:h-screen max-sm:fixed max-sm:left-0 max-sm:top-0 max-sm:bottom-0 z-20 ${
        isOpen ? "translate-x-0" : "max-sm:-translate-x-full"
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
      <div className="w-full border-t border-gray-200 p-4 px-7 flex items-center justify-between">
        <div className="flex gap-2 items-center cursor-pointer">
          <UserButton />
          <div className="flex flex-col leading-tight items-center">
            <h1 className="text-sm font-medium">{user.full_name}</h1>
            <p className="text-xs text-gray-500">@{user.username}</p>
          </div>
        </div>
        <LogOut
          onClick={() => signOut()}
          className="w-4.5 text-gray-400 hover:text-gray-700 transition cursor-pointer"
        />
      </div>
    </div>
  );
};

export default SideBar;
