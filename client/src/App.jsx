import { useEffect, useRef } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Feed from "./pages/Feed";
import Messages from "./pages/Messages";
import Connections from "./pages/Connections";
import Chatbox from "./pages/Chatbox";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import CreatePost from "./pages/CreatePost";
import Login from "./pages/Login";
import { useUser, useAuth } from "@clerk/react";
import Layout from "./pages/Layout";
import { Toaster, toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { fetchUser } from "./features/user/userSlice";
import { fetchConnections } from "./features/connections/connectionsSlice";
import { addMessage } from "./features/messages/messagesSlice";
import {
  addNotification,
  fetchNotifications,
  getNotificationId,
} from "./features/notifications/notificationsSlice";
import Notification from "./components/Notification";
import Notifications from "./pages/Notifications";

const getTokenExpiry = (token) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    const parsed = JSON.parse(window.atob(padded));
    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
};

const App = () => {
  const { user } = useUser();
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);
  const activityNotificationIdsRef = useRef(new Set());
  const hasLoadedActivityNotificationsRef = useRef(false);
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      if (!isLoaded || !isSignedIn || !user) {
        return;
      }

      let token = await getToken({ skipCache: true });
      const expiry = token ? getTokenExpiry(token) : null;
      const nowInSeconds = Math.floor(Date.now() / 1000);

      if (token && expiry && expiry <= nowInSeconds) {
        await user.reload();
        token = await getToken({ skipCache: true });
      }

      if (token) {
        dispatch(fetchUser(token));
        dispatch(fetchConnections(token));
        dispatch(fetchNotifications({ token, currentUserId: user.id }));
      }
    };

    fetchData();
  }, [user, getToken, isLoaded, isSignedIn, dispatch]);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const eventSource = new EventSource(
      `${
        import.meta.env.VITE_BASE_URL || "http://localhost:4000"
      }/api/message/${user.id}`
    );

    eventSource.onmessage = (event) => {
      if (!event.data) {
        return;
      }

      const message = JSON.parse(event.data);
      const messageNotification = {
        _id: `message-${message._id}`,
        type: "message",
        actor: message.from_user_id,
        from_user_id: message.from_user_id,
        message,
        message_type: message.message_type,
        text:
          message.message_type === "image"
            ? "Sent you an image"
            : message.text || "Sent you a message",
        seen: false,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      };
      const isActiveChat =
        pathnameRef.current === `/messages/${message.from_user_id?._id}`;

      dispatch(addNotification(messageNotification));

      if (isActiveChat) {
        dispatch(addMessage(message));
      }

      toast.custom((t) => <Notification t={t} notification={messageNotification} />, {
        position: "bottom-right",
        duration: 10000,
      });
    };

    return () => {
      eventSource.close();
    };
  }, [user, dispatch]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      return;
    }

    let isCancelled = false;

    const syncActivityNotifications = async () => {
      const token = await getToken();
      if (!token || isCancelled) {
        return;
      }

      const result = await dispatch(
        fetchNotifications({ token, currentUserId: user.id })
      );

      if (!fetchNotifications.fulfilled.match(result) || isCancelled) {
        return;
      }

      const activityNotifications = result.payload.filter((notification) =>
        ["like", "comment"].includes(notification.type)
      );
      const newActivityNotifications = activityNotifications.filter(
        (notification) =>
          !activityNotificationIdsRef.current.has(getNotificationId(notification))
      );

      activityNotifications.forEach((notification) => {
        activityNotificationIdsRef.current.add(getNotificationId(notification));
      });

      if (!hasLoadedActivityNotificationsRef.current) {
        hasLoadedActivityNotificationsRef.current = true;
        return;
      }

      newActivityNotifications.reverse().forEach((notification) => {
        toast.custom((t) => <Notification t={t} notification={notification} />, {
          position: "bottom-right",
          duration: 10000,
        });
      });
    };

    syncActivityNotifications();
    const intervalId = setInterval(syncActivityNotifications, 15000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [user, getToken, isLoaded, isSignedIn, dispatch]);

  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path="feed" element={<Feed />} />
          <Route path="messages" element={<Messages />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="messages/:userId" element={<Chatbox />} />
          <Route path="connections" element={<Connections />} />
          <Route path="discover" element={<Discover />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:profileId" element={<Profile />} />
          <Route path="create-post" element={<CreatePost />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
