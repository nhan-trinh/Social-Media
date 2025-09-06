import {
  BadgeCheck,
  Ellipsis,
  Heart,
  MessageCircle,
  Share2,
  Edit,
  Trash2,
  EyeOff,
  Undo2,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import CommentModal from "./CommentModal";
import DeleteModal from "../components/DeleteModal";
import EditModal from "../components/EditModalComment";
import SharePostModal from "./SharePostModal";

const PostCard = ({ 
  post, 
  onPostUpdated, 
  onPostDeleted, 
  onPostVisibilityChanged,
  onPostShared 
}) => {
  // Sử dụng local state cho content để reflect thay đổi ngay lập tức
  const [currentContent, setCurrentContent] = useState(post.content);
  
  const postWithHashtags = currentContent.replace(
    /(#\w+)/g,
    '<span class="text-indigo-600">$1</span>'
  );
  const [likes, setLikes] = useState(post.likes_count);
  const [shareCount, setShareCount] = useState(post.share_count || 0);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const dropdownRef = useRef(null);

  // Sync currentContent khi post.content thay đổi từ props
  useEffect(() => {
    setCurrentContent(post.content);
  }, [post.content]);

  // Sync shareCount khi post.share_count thay đổi từ props
  useEffect(() => {
    setShareCount(post.share_count || 0);
  }, [post.share_count]);

  // Khởi tạo commentsCount với giá trị từ sessionStorage nếu có
  const getInitialCommentCount = () => {
    try {
      const savedCount = sessionStorage.getItem(`commentCount_${post._id}`);
      if (savedCount !== null) {
        const parsedCount = parseInt(savedCount);
        console.log(
          `Restored comment count from storage: ${parsedCount} for post ${post._id}`
        );
        return parsedCount;
      }
    } catch (error) {
      console.error("Error reading from sessionStorage:", error);
    }
    return post.comments_count || 0;
  };

  const [commentsCount, setCommentsCount] = useState(getInitialCommentCount);

  const currentUser = useSelector((state) => state.user.value);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  // Sync commentsCount khi post.comments_count thay đổi (từ props)
  useEffect(() => {
    if (post.comments_count !== undefined && post.comments_count !== null) {
      // Chỉ cập nhật nếu không có giá trị trong sessionStorage
      const savedCount = sessionStorage.getItem(`commentCount_${post._id}`);
      if (savedCount === null) {
        setCommentsCount(post.comments_count);
      }
    }
  }, [post.comments_count, post._id]);

  // Lưu comment count vào sessionStorage mỗi khi thay đổi
  useEffect(() => {
    try {
      sessionStorage.setItem(
        `commentCount_${post._id}`,
        commentsCount.toString()
      );
    } catch (error) {
      console.error("Error saving to sessionStorage:", error);
    }
  }, [commentsCount, post._id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLike = async () => {
    try {
      const { data } = await api.post(
        `/api/post/like`,
        { postId: post._id },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        }
      );

      if (data.success) {
        toast.success(data.message);
        setLikes((prev) => {
          if (prev.includes(currentUser._id)) {
            return prev.filter((id) => id !== currentUser._id);
          } else {
            return [...prev, currentUser._id];
          }
        });
      } else {
        toast(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Cập nhật hàm handleCommentUpdate để nhận số lượng thay đổi chính xác
  const handleCommentUpdate = (change = 1) => {
    setCommentsCount((prev) => {
      const newCount = prev + change;
      console.log(`Comment count update: ${prev} + ${change} = ${newCount}`);
      return Math.max(0, newCount);
    });
  };

  // Hàm sync để cập nhật từ CommentModal
  const handleCommentsCountSync = (newCount) => {
    console.log(`Syncing comment count to: ${newCount} for post ${post._id}`);
    setCommentsCount(Math.max(0, newCount));

    // Cập nhật sessionStorage
    try {
      sessionStorage.setItem(
        `commentCount_${post._id}`,
        Math.max(0, newCount).toString()
      );
    } catch (error) {
      console.error("Error saving to sessionStorage:", error);
    }
  };

  const handleHidePost = () => {
    setIsHidden(true);
    setIsDropdownOpen(false);
    toast.success("Post hidden");
    
    // Notify parent component
    if (onPostVisibilityChanged) {
      onPostVisibilityChanged(post._id, true);
    }
  };

  const handleUnhidePost = () => {
    setIsHidden(false);
    toast.success("Post restored");
    
    // Notify parent component
    if (onPostVisibilityChanged) {
      onPostVisibilityChanged(post._id, false);
    }
  };

  const handleDeletePost = () => {
    setIsDeleteModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleEditPost = () => {
    setIsEditModalOpen(true);
    setIsDropdownOpen(false);
  };

  // Handler khi post được update thành công
  const handlePostUpdateSuccess = (postId, newContent) => {
    setCurrentContent(newContent);
    
    // Notify parent component to update the main feed
    if (onPostUpdated) {
      onPostUpdated(postId, newContent);
    }
  };

  // Handler khi post bị delete thành công
  const handlePostDeleteSuccess = (postId) => {
    // Notify parent component to remove post from feed
    if (onPostDeleted) {
      onPostDeleted(postId);
    }
  };

  // Handler khi post được share thành công
  const handleShareSuccess = () => {
    setShareCount(prev => prev + 1);
    setIsSharingModalOpen(false);
    
    // Notify parent component
    if (onPostShared) {
      onPostShared(post._id);
    }
  };

  const isOwner = currentUser._id === post.user._id;

  // Hidden Post Card
  if (isHidden) {
    return (
      <div className="bg-gray-100 rounded-xl shadow p-4 space-y-4 w-full max-w-2xl border-2 border-dashed border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EyeOff className="w-5 h-5 text-gray-500" />
            <span className="text-gray-600 text-sm">Post hidden</span>
          </div>
          <button
            onClick={handleUnhidePost}
            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
        </div>
        <div className="text-gray-500 text-sm">
          Post by @{post.user.username} • {moment(post.createdAt).fromNow()}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow p-4 space-y-4 w-full max-w-2xl">
        <div className="flex items-start justify-between">
          <div
            onClick={() => navigate(`/profile/` + post.user._id)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <img
              src={post.user.profile_picture}
              alt=""
              className="w-10 h-10 rounded-full shadow"
            />
            <div>
              <div className="flex items-center space-x-1">
                <span>{post.user.full_name}</span>
                <BadgeCheck className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-gray-500 text-sm">
                @{post.user.username} has posted{" "}
                {moment(post.createdAt).fromNow()}
              </div>
            </div>
          </div>

          {/* Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <Ellipsis className="w-5 h-5 text-gray-500" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[150px] z-50">
                {isOwner ? (
                  <>
                    <button
                      onClick={handleEditPost}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Post
                    </button>
                    <button
                      onClick={handleDeletePost}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Post
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleHidePost}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <EyeOff className="w-4 h-4" />
                    Hide Post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {currentContent && (
          <div
            className="text-gray-800 text-sm whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: postWithHashtags }}
          />
        )}

        <div
          onClick={() => setIsCommentModalOpen(true)}
          className="grid grid-cols-2 gap-2 cursor-pointer"
        >
          {post.image_urls.map((media, index) => {
            // Kiểm tra định dạng file để render đúng loại
            const isVideo = /\.(mp4|webm|ogg)$/i.test(media);
            return isVideo ? (
              <video
                key={index}
                src={media}
                controls
                className={`w-full h-48 object-cover rounded-lg ${
                  post.image_urls.length === 1 && "col-span-2 h-auto"
                }`}
              />
            ) : (
              <img
                src={media}
                key={index}
                className={`w-full h-48 object-cover rounded-lg ${
                  post.image_urls.length === 1 && "col-span-2 h-auto"
                }`}
                alt=""
              />
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-gray-600 text-sm pt-2 border-t border-gray-300">
          <div className="flex items-center gap-1">
            <Heart
              className={`w-4 h-4 cursor-pointer ${
                likes.includes(currentUser._id) && "text-red-500 fill-red-500"
              }`}
              onClick={handleLike}
            />
            <span>{likes.length}</span>
          </div>
          <div
            className="flex items-center gap-1 cursor-pointer hover:text-indigo-600"
            onClick={() => setIsCommentModalOpen(true)}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{commentsCount}</span>
          </div>
          <div
            className="flex items-center gap-1 cursor-pointer hover:text-indigo-600"
            onClick={() => setIsSharingModalOpen(true)}
          >
            <Share2 className="w-4 h-4" />
            <span>{shareCount}</span>
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      <CommentModal
        post={post}
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        currentUser={currentUser}
        onCommentAdded={handleCommentUpdate}
        initialCommentsCount={commentsCount}
        onCommentsCountSync={handleCommentsCountSync}
      />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        post={post}
        onPostDeleted={handlePostDeleteSuccess}
      />

      {/* Edit Modal */}
      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        post={post}
        onPostUpdated={handlePostUpdateSuccess}
      />

      <SharePostModal 
        isOpen={isSharingModalOpen}
        onClose={() => setIsSharingModalOpen(false)}
        post={post}
        onShareSuccess={handleShareSuccess}
      />
    </>
  );
};

export default PostCard;