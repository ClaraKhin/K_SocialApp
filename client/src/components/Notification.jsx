import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const Notification = ({ message, notification, t }) => {
  const navigate = useNavigate();
  const data = notification || message;
  const type = data?.type || "message";
  const sender = data?.actor || data?.from_user_id;
  const preview =
    data?.message_type === "image"
      ? "Sent an image"
      : data?.text
      ? `${data.text.slice(0, 50)}${data.text.length > 50 ? "..." : ""}`
      : type === "like"
      ? "Liked your post"
      : type === "comment"
      ? "Commented on your post"
      : "Sent you a message";
  const title =
    type === "like"
      ? `${sender?.full_name || "Someone"} liked your post`
      : type === "comment"
      ? `${sender?.full_name || "Someone"} commented on your post`
      : `${sender?.full_name || "Someone"} sent you a message`;
  const actionLabel = type === "message" ? "Reply" : "View";
  const actionPath = type === "message" ? `/messages/${sender?._id}` : "/profile";

  return (
    <div
      className={`w-[calc(100vw-2rem)] sm:w-96 bg-white shadow-lg rounded-lg flex border border-gray-300 transition duration-200 ${
        t.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="flex-1 p-4">
        <div className="flex items-start">
          {sender?.profile_picture ? (
            <img
              src={sender.profile_picture}
              alt=""
              className="size-10 rounded-full object-cover object-top bg-gray-100"
            />
          ) : (
            <span className="size-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold">
              {(sender?.full_name || "S").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{title}</p>
            <p className="text-sm text-gray-500 truncate">{preview}</p>
          </div>
        </div>
      </div>
      <div className="flex ">
        <button
          onClick={() => {
            navigate(actionPath);
            toast.dismiss(t.id);
          }}
          className="p-4 text-indigo-600 font-semibold hover:bg-indigo-50"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

export default Notification;
