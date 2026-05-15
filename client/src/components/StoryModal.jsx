import { useState } from "react";
import { ArrowLeft } from "lucide-react";

const StoryModal = ({ setShowModal, fetchStories }) => {
  const bgColors = [
    "#4f46e5",
    "#7c3aed",
    "#db2777",
    "#e114d8",
    "#ca8a04",
    "#0d9488",
  ];
  const [mode, setMode] = useState("text");
  const [background, setBackground] = useState(bgColors[0]);
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  //handle media upload
  const handleMediaUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setMedia(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  //handle create story
  const handleCreateStory = async () => {};

  return (
    <div className="fixed inset-0 z-110 min-h-screen bg-black/80 backdrop-blur text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md ">
        <div className="text-center mb-4 flex items-center justify-between">
          <button
            onClick={() => setShowModal(false)}
            className="text-white p-2 cursor-pointer"
          >
            <ArrowLeft />
          </button>
          <h1 className="text-lg font-semibold">Create Story</h1>
          <span className="w-10"></span>
        </div>
      </div>
    </div>
  );
};

export default StoryModal;
