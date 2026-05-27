import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Heart,
  MessageCircle,
  Share2,
  SquarePen,
  Trash2,
  SendIcon,
} from "lucide-react";
import moment from "moment";
// import { dummyUserData } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../api/axios";
import { useAuth } from "@clerk/react";
import { toast } from "react-hot-toast";

const PostCard = ({ post, onPostUpdate }) => {
  const [likes, setLikes] = useState(post.likes_count || []);
  const [comments, setComments] = useState(post.comments || []);
  const [commentInput, setCommentInput] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingCommentText, setEditingCommentText] = useState("");
  const [commentActionId, setCommentActionId] = useState("");
  const currentUser = useSelector((state) => state.user.value);
  const navigate = useNavigate();
  const postsWithHashtags = (post.content || "").replace(
    /(#\w+)/g,
    "<span class='text-indigo-600'>$1</span>"
  );

  const { getToken } = useAuth();
  const hasLiked = likes.includes(currentUser?._id);

  useEffect(() => {
    setLikes(post.likes_count || []);
    setComments(post.comments || []);
  }, [post.likes_count, post.comments]);

  const resetCommentEditor = () => {
    setEditingCommentId("");
    setEditingCommentText("");
  };

  const syncCommentsState = (nextComments) => {
    setComments(nextComments || []);
    setShowComments(true);
  };

  const syncPostState = (updatedPost) => {
    if (!updatedPost) {
      return;
    }

    setLikes(updatedPost.likes_count || []);
    setComments(updatedPost.comments || []);
    onPostUpdate?.(updatedPost);
  };

  const handleLike = async () => {
    if (!currentUser?._id) {
      toast.error("Please sign in to like posts");
      return;
    }

    try {
      const { data } = await api.post(
        "/api/post/like",
        { postId: post._id },
        {
          headers: { Authorization: `Bearer ${await getToken()}` },
        }
      );
      if (data.success) {
        toast.success(data.message);
        if (data.post) {
          syncPostState(data.post);
        } else {
          setLikes((prevLikes) =>
            prevLikes.includes(currentUser._id)
              ? prevLikes.filter((id) => id !== currentUser._id)
              : [...prevLikes, currentUser._id]
          );
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error liking post:", error.message);
      toast.error(error.message);
    }
  };

  const handleComment = async () => {
    if (!currentUser?._id) {
      toast.error("Please sign in to comment");
      return;
    }

    const trimmedComment = commentInput.trim();

    if (!trimmedComment) {
      toast.error("Please write a comment first");
      return;
    }

    try {
      setIsSubmittingComment(true);
      const { data } = await api.post(
        "/api/post/comment",
        { postId: post._id, comment: trimmedComment },
        {
          headers: { Authorization: `Bearer ${await getToken()}` },
        }
      );

      if (data.success) {
        toast.success(data.message);
        syncCommentsState(data.comments);
        syncPostState(data.post);
        setCommentInput("");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error commenting on post:", error.message);
      toast.error(error.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const startEditingComment = (comment) => {
    resetCommentEditor();
    setEditingCommentId(comment._id);
    setEditingCommentText(comment.text);
    setShowComments(true);
  };

  const handleUpdateComment = async (commentId) => {
    const trimmedComment = editingCommentText.trim();

    if (!trimmedComment) {
      toast.error("Please write a comment first");
      return;
    }

    try {
      setCommentActionId(commentId);
      const { data } = await api.post(
        "/api/post/comment/update",
        { postId: post._id, commentId, comment: trimmedComment },
        {
          headers: { Authorization: `Bearer ${await getToken()}` },
        }
      );

      if (data.success) {
        toast.success(data.message);
        syncCommentsState(data.comments);
        syncPostState(data.post);
        resetCommentEditor();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error updating comment:", error.message);
      toast.error(error.message);
    } finally {
      setCommentActionId("");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      setCommentActionId(commentId);
      const { data } = await api.post(
        "/api/post/comment/delete",
        { postId: post._id, commentId },
        {
          headers: { Authorization: `Bearer ${await getToken()}` },
        }
      );

      if (data.success) {
        toast.success(data.message);
        syncCommentsState(data.comments);
        syncPostState(data.post);

        if (editingCommentId === commentId) {
          resetCommentEditor();
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error deleting comment:", error.message);
      toast.error(error.message);
    } finally {
      setCommentActionId("");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-4 w-full max-w-3xl">
      {/* User Info */}
      <div
        onClick={() => navigate(`/profile/${post.user._id}`)}
        className="inline-flex items-center gap-3 cursor-pointer"
      >
        <img
          src={post.user.profile_picture}
          alt=""
          className="w-10 h-10 rounded-full shadow object-cover object-top"
        />
        <div>
          <div className="flex items-center space-x-1">
            <span>{post.user.full_name}</span>
            <BadgeCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-sm text-gray-500">
            @{post.user.username} . {moment(post.createdAt).fromNow()}
          </div>
        </div>
      </div>

      {/* Post Content */}
      {post.content && (
        <div className="text-gray-800 text-sm whitespace-pre-line">
          {postsWithHashtags.split("\n").map((line, index) => (
            <p key={index} dangerouslySetInnerHTML={{ __html: line }} />
          ))}
        </div>
      )}

      {/* Post Media */}
      {post.image_urls.length > 0 && (
        <div className="grid grid-cols-2 gap-2 cursor-pointer">
          {post.image_urls.map((img, index) => (
            <img
              src={img}
              key={index}
              alt=""
              className={`w-full h-48 object-cover rounded-lg ${
                post.image_urls.length === 1 && "col-span-2 h-auto"
              }`}
            />
          ))}
        </div>
      )}

      {post.video_url && (
        <video
          src={post.video_url}
          controls
          className="w-full max-h-[32rem] rounded-lg bg-black"
        />
      )}

      {/* Post Actions */}
      <div className="flex items-center gap-4 text-gray-600 text-sm pt-2 border-t border-gray-300">
        <div className="flex items-center gap-1">
          <Heart
            className={`w-4 h-4 cursor-pointer ${
              hasLiked && "text-red-500 fill-red-500"
            }`}
            onClick={handleLike}
          />
          <span className="ml-1">{likes.length}</span>
        </div>

        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className="flex items-center gap-1 cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="ml-1">{comments.length}</span>
        </button>

        <div className="flex items-center gap-1">
          <Share2 className="w-4 h-4" />
          <span className="ml-1">Share</span>
        </div>
      </div>

      <div className="space-y-3 border-t border-gray-200 pt-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onFocus={() => setShowComments(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isSubmittingComment) {
                handleComment();
              }
            }}
            placeholder="Write a comment..."
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={handleComment}
            disabled={isSubmittingComment}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo--700 hover:to-purple-800 px-4 py-2 text-sm font-medium text-white cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmittingComment ? (
              "Posting..."
            ) : (
              <SendIcon className="w-4 h-4" />
            )}
          </button>
        </div>

        {showComments && (
          <div className="space-y-3">
            {comments.length ? (
              comments.map((comment) => {
                const commentUser =
                  comment.user && typeof comment.user === "object"
                    ? comment.user
                    : null;
                const commentUserId = commentUser?._id || comment.user;
                const isOwnComment = commentUserId === currentUser?._id;
                const isEditing = editingCommentId === comment._id;
                const isCommentActionLoading = commentActionId === comment._id;

                return (
                  <div
                    key={comment._id || `${comment.user}-${comment.createdAt}`}
                    className="flex gap-3 rounded-xl bg-gray-50 p-3"
                  >
                    {commentUser?.profile_picture ? (
                      <img
                        src={commentUser.profile_picture}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                        {commentUser?.full_name?.[0] || "U"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              commentUser?._id &&
                              navigate(`/profile/${commentUser._id}`)
                            }
                            className="font-medium text-gray-800"
                          >
                            {commentUser?.full_name || "Unknown user"}
                          </button>
                          <span className="text-xs text-gray-500">
                            @{commentUser?.username || "unknown"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {moment(comment.createdAt).fromNow()}
                          </span>
                        </div>

                        {isOwnComment && (
                          <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => startEditingComment(comment)}
                              className="inline-flex items-center gap-1 text-indigo-600 cursor-pointer"
                            >
                              <SquarePen className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment._id)}
                              disabled={isCommentActionLoading}
                              className="inline-flex items-center gap-1 text-red-500 disabled:opacity-60 cursor-pointer"
                            >
                              {isCommentActionLoading ? (
                                "Deleting..."
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <input
                            type="text"
                            value={editingCommentText}
                            onChange={(e) =>
                              setEditingCommentText(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                !isCommentActionLoading
                              ) {
                                handleUpdateComment(comment._id);
                              }
                            }}
                            className="w-full rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
                          />
                          <div className="flex items-center gap-2 text-xs ">
                            <button
                              type="button"
                              onClick={() => handleUpdateComment(comment._id)}
                              disabled={isCommentActionLoading}
                              className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-800 px-3 py-2 font-medium text-white disabled:opacity-60 cursor-pointer"
                            >
                              {isCommentActionLoading ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={resetCommentEditor}
                              disabled={isCommentActionLoading}
                              className="rounded-full border border-gray-300 px-3 py-2 font-medium text-gray-600 disabled:opacity-60 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-gray-700">
                          {comment.text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">
                No comments yet. Be the first to say something.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCard;
