import { useEffect, useMemo } from "react";
import { useAuth, useUser } from "@clerk/react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { Bell, Heart, ImageIcon, Loader2, MessageCircle } from "lucide-react";
import {
  fetchNotifications,
  markAllNotificationsRead,
} from "../features/notifications/notificationsSlice";

const getNotificationType = (notification) => {
  if (notification.type) {
    return notification.type;
  }

  if (notification.text?.toLowerCase().startsWith("liked ")) {
    return "like";
  }

  if (notification.comment) {
    return "comment";
  }

  return "message";
};

const Notifications = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { items, loading, error } = useSelector((state) => state.notifications);

  const notifications = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      ),
    [items]
  );

  useEffect(() => {
    const loadNotifications = async () => {
      if (!isLoaded || !isSignedIn) {
        return;
      }

      const token = await getToken();
      if (token) {
        dispatch(fetchNotifications({ token, currentUserId: user?.id }));
      }
    };

    loadNotifications();
  }, [dispatch, getToken, isLoaded, isSignedIn, user?.id]);

  useEffect(() => {
    if (items.some((notification) => notification.isUnread)) {
      dispatch(markAllNotificationsRead());
    }
  }, [dispatch, items]);

  const getPreview = (notification) => {
    const type = getNotificationType(notification);

    if (type === "like") {
      return notification.text || "Liked your post";
    }

    if (type === "comment") {
      return notification.text || "Commented on your post";
    }

    if (notification.message_type === "image") {
      return "Sent you an image";
    }

    return notification.text || "Sent you a message";
  };

  const getTitle = (notification) => {
    const type = getNotificationType(notification);
    const actor = notification.actor || notification.from_user_id;
    const actorName = actor?.full_name || "Someone";

    if (type === "like") {
      return `${actorName} liked your post`;
    }

    if (type === "comment") {
      return `${actorName} commented on your post`;
    }

    return `${actorName} sent you a message`;
  };

  const openNotification = (notification) => {
    const type = getNotificationType(notification);

    if (type !== "message") {
      const postId = notification.post?._id || notification.post;
      navigate(postId ? `/profile?post=${postId}` : "/profile");
      return;
    }

    const senderId = notification.actor?._id || notification.from_user_id?._id;

    if (senderId) {
      navigate(`/messages/${senderId}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEEEEE]">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <span className="size-11 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Notifications
              </h1>
              <p className="text-slate-600">
                All notifications
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md shadow border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                All notifications
              </h2>
              <p className="text-sm text-slate-500">
                {notifications.length} total
              </p>
            </div>
            {loading && (
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
            )}
          </div>

          {error && (
            <p className="px-6 py-3 text-sm text-red-600 border-b border-red-100 bg-red-50">
              {error}
            </p>
          )}

          {notifications.length === 0 && !loading ? (
            <div className="px-6 py-14 text-center">
              <div className="size-12 mx-auto mb-3 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
                <Bell className="w-5 h-5" />
              </div>
              <p className="font-medium text-slate-800">No notifications yet</p>
              <p className="text-sm text-slate-500">
                New messages, likes, and comments will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const type = getNotificationType(notification);
                const sender = notification.actor || notification.from_user_id;
                const senderName = sender?.full_name || "Someone";
                const senderAvatar = sender?.profile_picture;

                return (
                  <button
                    key={notification._id || notification.createdAt}
                    type="button"
                    onClick={() => openNotification(notification)}
                    className="w-full px-6 py-4 text-left flex items-start gap-4 hover:bg-slate-50 transition"
                  >
                    {senderAvatar ? (
                      <img
                        src={senderAvatar}
                        alt=""
                        className="size-12 rounded-full object-cover object-top bg-gray-100"
                      />
                    ) : (
                      <span className="size-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold">
                        {senderName.charAt(0).toUpperCase()}
                      </span>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">
                          {getTitle(notification)}
                        </p>
                        {notification.isUnread && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium">
                            Unread
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600 truncate">
                        {getPreview(notification)}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {notification.createdAt
                          ? moment(notification.createdAt).fromNow()
                          : "Just now"}
                      </p>
                    </div>

                    <span className="size-10 shrink-0 rounded-md bg-[#d6e6f2] text-slate-800 flex items-center justify-center">
                      {type === "like" ? (
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                      ) : notification.message_type === "image" ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <MessageCircle className="w-4 h-4" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
