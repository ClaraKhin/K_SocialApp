import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
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
import { Toaster } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { fetchUser } from "./features/user/userSlice";
import { fetchConnections } from "./features/connections/connectionsSlice";

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
      }
    };

    fetchData();
  }, [user, getToken, isLoaded, isSignedIn, dispatch]);

  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path="feed" element={<Feed />} />
          <Route path="messages" element={<Messages />} />
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
