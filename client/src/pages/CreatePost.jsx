import { useState } from "react";
// import { dummyUserData } from "../assets/assets";
import { X, Image, Video } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

const uploadVideoDirectly = async (video, token) => {
  const { data } = await api.get("/api/post/imagekit-auth", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!data.success) {
    throw new Error(data.message || "Failed to prepare video upload");
  }

  const formData = new FormData();
  formData.append("file", video);
  formData.append("fileName", video.name);
  formData.append("token", data.token);
  formData.append("expire", data.expire);
  formData.append("signature", data.signature);
  formData.append("publicKey", data.publicKey);
  formData.append("folder", "posts");
  formData.append("useUniqueFileName", "true");

  const response = await fetch(
    "https://upload.imagekit.io/api/v1/files/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.message || "Video upload failed");
  }

  return result.url || result.filePath;
};

const CreatePost = () => {
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const user = useSelector((state) => state.user.value);
  const { getToken } = useAuth();

  const handleImageChange = (e) => {
    const selectedImages = Array.from(e.target.files || []);
    if (!selectedImages.length) {
      return;
    }

    setVideo(null);
    setImages((currentImages) => [...currentImages, ...selectedImages]);
    e.target.value = "";
  };

  const handleVideoChange = (e) => {
    const selectedVideo = e.target.files?.[0];
    if (!selectedVideo) {
      return;
    }

    setImages([]);
    setVideo(selectedVideo);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!images.length && !video && !content.trim()) {
      return toast.error("Please add text, image, or video");
    }

    setLoading(true);

    const postType = video
      ? content.trim()
        ? "text_with_video"
        : "video"
      : images.length && content.trim()
      ? "text_with_image"
      : images.length
      ? "image"
      : "text";

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Please sign in again to upload this video");
      }

      const formData = new FormData();
      formData.append("content", content.trim());
      formData.append("post_type", postType);

      images.forEach((image) => {
        formData.append("images", image);
      });

      if (video) {
        const videoUrl = await uploadVideoDirectly(video, token);
        formData.append("video_url", videoUrl);
      }

      const { data } = await api.post("/api/post/add", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        navigate("/");
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEEEEE]">
      <div className="max-w-6xl mx-auto p-6">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Create Post
          </h1>
          <p className="text-slate-600">Share your thoughts with the world</p>
        </div>

        {/* Form */}
        <div className="max-w-xl bg-white p-4 sm:p-8 sm:pb-3 rounded-xl shadow-md space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <img
              src={user.profile_picture}
              alt=""
              className="w-12 h-12 rounded-full shadow object-cover object-top"
            />
            <div>
              <h2 className="font-semibold">{user.full_name}</h2>
              <p className="text-sm text-gray-500">@{user.username}</p>
            </div>
          </div>

          {/* Text Area */}
          <textarea
            className="w-full resize-none max-h-20 mt-4 text-sm outline-none placeholder-gray-400"
            placeholder="What's happenig?"
            onChange={(e) => setContent(e.target.value)}
            value={content}
          />
          {/* Images */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {images.map((image, i) => (
                <div key={i} className="relative group">
                  <img
                    src={URL.createObjectURL(image)}
                    alt=""
                    className="h-20 rounded-md"
                  />
                  <div
                    onClick={() =>
                      setImages(images.filter((_, index) => index !== i))
                    }
                    className="absolute hidden group-hover:flex justify-center items-center top-0 right-0 bottom-0 left-0 bg-black/40 rounded-md cursor-pointer"
                  >
                    <X className="w-6 h-6 text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Video */}
          {video && (
            <div className="relative group mt-4">
              <video
                src={URL.createObjectURL(video)}
                controls
                className="w-full max-h-80 rounded-md bg-black"
              />
              <div
                onClick={() => setVideo(null)}
                className="absolute hidden group-hover:flex justify-center items-center top-0 right-0 w-12 h-12 bg-black/40 rounded-md cursor-pointer"
              >
                <X className="w-6 h-6 text-white" />
              </div>
            </div>
          )}

          {/* Bottom Bar */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-300">
            <div className="flex items-center gap-3">
              <label
                htmlFor="images"
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition cursor-pointer"
              >
                <Image className="size-6" />
              </label>
              <input
                type="file"
                id="images"
                accept="image/*"
                hidden
                multiple
                onChange={handleImageChange}
              />

              <label
                htmlFor="video"
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition cursor-pointer"
              >
                <Video className="size-6" />
              </label>
              <input
                type="file"
                id="video"
                accept="video/*"
                hidden
                onChange={handleVideoChange}
              />
            </div>

            <button
              disabled={loading}
              onClick={handleSubmit}
              className="px-8 py-2 text-sm font-medium rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 transition text-white cursor-pointer"
            >
              Publish Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
