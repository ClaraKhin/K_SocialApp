import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../api/axios";

const getNotificationId = (notification) =>
  notification?._id || `${notification?.from_user_id?._id}-${notification?.createdAt}`;

const normalizeNotification = (notification, readNotificationIds = []) => {
  const id = getNotificationId(notification);

  return {
    ...notification,
    isUnread: !notification?.seen && !readNotificationIds.includes(id),
  };
};

const initialState = {
  items: [],
  readNotificationIds: [],
  loading: false,
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (token, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/user/recent-messages", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!data.success) {
        return rejectWithValue(data.message || "Failed to fetch notifications");
      }

      return Array.isArray(data.data) ? data.data : [];
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
export default notificationsSlice.reducer;
