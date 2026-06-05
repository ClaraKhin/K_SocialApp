import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../api/axios";

const getNotificationId = (notification) =>
  notification?._id ||
  `${notification?.type || "message"}-${
    notification?.actor?._id || notification?.from_user_id?._id
  }-${notification?.post?._id || ""}-${notification?.createdAt}`;

const normalizeNotification = (notification, readNotificationIds = []) => {
  const id = getNotificationId(notification);

  return {
    ...notification,
    _id: id,
    isUnread:
      !notification?.seen &&
      !notification?.read &&
      !readNotificationIds.includes(id),
  };
};

const addUsersToMap = (map, users = []) => {
  users.forEach((user) => {
    if (user?._id) {
      map[user._id] = user;
    }
  });
};

const createUserMap = (state) => {
  const userMap = {};
  const currentUser = state.user.value;
  const { connections, followers, following, pendingConnections } =
    state.connections;

  addUsersToMap(userMap, [currentUser]);
  addUsersToMap(userMap, connections);
  addUsersToMap(userMap, followers);
  addUsersToMap(userMap, following);
  addUsersToMap(userMap, pendingConnections);

  return userMap;
};

const createPostPreview = (post) => {
  if (post.content) {
    return `${post.content.slice(0, 70)}${post.content.length > 70 ? "..." : ""}`;
  }

  if (post.post_type?.includes("image")) {
    return "your photo post";
  }

  if (post.post_type?.includes("video")) {
    return "your video post";
  }

  return "your post";
};

const mapMessageNotification = (message) => ({
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
  seen: message.seen,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const mapPostNotifications = (posts, currentUserId, userMap) =>
  posts
    .filter((post) => (post.user?._id || post.user) === currentUserId)
    .flatMap((post) => {
      const postPreview = createPostPreview(post);
      const likeNotifications = (post.likes_count || [])
        .filter((userId) => userId !== currentUserId)
        .map((userId) => {
          const actor = userMap[userId] || { _id: userId };

          return {
            _id: `like-${post._id}-${userId}`,
            type: "like",
            actor,
            post,
            text: `liked ${postPreview}`,
            createdAt: post.updatedAt || post.createdAt,
            updatedAt: post.updatedAt,
          };
        });

      const commentNotifications = (post.comments || [])
        .filter((comment) => {
          const commentUserId = comment.user?._id || comment.user;
          return commentUserId && commentUserId !== currentUserId;
        })
        .map((comment) => ({
          _id: `comment-${post._id}-${comment._id}`,
          type: "comment",
          actor: comment.user,
          post,
          comment,
          text: comment.text,
          createdAt: comment.createdAt || post.updatedAt || post.createdAt,
          updatedAt: comment.createdAt || post.updatedAt,
        }));

      return [...likeNotifications, ...commentNotifications];
    });

const initialState = {
  items: [],
  readNotificationIds: [],
  loading: false,
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (params, { getState, rejectWithValue }) => {
    try {
      const token = typeof params === "string" ? params : params.token;
      const state = getState();
      const currentUserId =
        (typeof params === "string" ? null : params.currentUserId) ||
        state.user.value?._id;
      const userMap = createUserMap(state);
      const headers = { Authorization: `Bearer ${token}` };

      const [messagesResponse, feedResponse] = await Promise.all([
        api.get("/api/user/recent-messages", { headers }),
        currentUserId
          ? api.get("/api/post/feed", { headers })
          : Promise.resolve({ data: { success: true, posts: [] } }),
      ]);

      const messagesData = messagesResponse.data;
      const feedData = feedResponse.data;

      if (!messagesData.success) {
        return rejectWithValue(
          messagesData.message || "Failed to fetch notifications"
        );
      }

      if (!feedData.success) {
        return rejectWithValue(
          feedData.message || "Failed to fetch notifications"
        );
      }

      const messageNotifications = Array.isArray(messagesData.data)
        ? messagesData.data.map(mapMessageNotification)
        : [];
      const postNotifications = Array.isArray(feedData.posts)
        ? mapPostNotifications(feedData.posts, currentUserId, userMap)
        : [];

      return [...messageNotifications, ...postNotifications].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch notifications"
      );
    }
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const notification = normalizeNotification(action.payload);
      const notificationId = getNotificationId(notification);
      const existingIndex = state.items.findIndex(
        (item) => getNotificationId(item) === notificationId
      );

      if (existingIndex >= 0) {
        state.items[existingIndex] = notification;
      } else {
        state.items.unshift(notification);
      }
    },
    markAllNotificationsRead: (state) => {
      const ids = state.items.map(getNotificationId).filter(Boolean);
      state.readNotificationIds = Array.from(
        new Set([...state.readNotificationIds, ...ids])
      );
      state.items = state.items.map((notification) => ({
        ...notification,
        isUnread: false,
      }));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.map((notification) =>
          normalizeNotification(notification, state.readNotificationIds)
        );
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch notifications";
      });
  },
});

export const { addNotification, markAllNotificationsRead } =
  notificationsSlice.actions;
export { getNotificationId };
export default notificationsSlice.reducer;
