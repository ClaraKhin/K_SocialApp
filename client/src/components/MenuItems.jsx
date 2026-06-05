import { menuItemsData } from "../assets/assets";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";

const MenuItems = ({ setSidebarOpen }) => {
  const unreadNotifications = useSelector(
    (state) =>
      state.notifications.items.filter((notification) => notification.isUnread)
        .length
  );

  return (
    <div className="px-6 text-gray-700 space-y-1 font-medium">
      {menuItemsData.map(({ to, label, Icon }) => {
        const showNotificationBadge =
          to === "/notifications" && unreadNotifications > 0;

        return (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `px-3 py-2 flex items-center gap-3 rounded-xl ${
                isActive ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50"
              }`
            }
          >
            <span className="relative">
              <Icon className="w-5 h-5" />
              {showNotificationBadge && (
                <span
                  aria-label={`${unreadNotifications} unread notifications`}
                  className="absolute -right-2.5 -top-2.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold leading-none text-white ring-2 ring-white"
                >
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </span>
            {label}
          </NavLink>
        );
      })}
    </div>
  );
};

export default MenuItems;
