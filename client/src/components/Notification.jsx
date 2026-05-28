import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const Notification = ({ message, t }) => {
  const navigate = useNavigate();
  const sender = message?.from_user_id;
  const preview =
    message?.message_type === "image"
      ? "Sent an image"
      : message?.text
      ? `${message.text.slice(0, 50)}${message.text.length > 50 ? "..." : ""}`
      : "Sent you a message";

  return (
    <div
      className={`w-[calc(100vw-2rem)] sm:w-96 bg-white shadow-lg rounded-lg flex border border-gray-300 transition duration-200 ${
        t.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="flex-1 p-4">
        <div className="flex items-start">
          <img
            src={sender?.profile_picture}
            alt=""
            className="size-10 rounded-full object-cover object-top bg-gray-100"
          />
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {sender?.full_name || "Someone"} sent you a message
            </p>
            <p className="text-sm text-gray-500 truncate">{preview}</p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-gray-300">
        <button
          onClick={() => {
            navigate(`/messages/${sender?._id}`);
            toast.dismiss(t.id);
          }}
          className="p-4 text-indigo-600 font-semibold hover:bg-indigo-50"
        >
          Reply
        </button>
      </div>
    </div>
  );
};

export default Notification;
