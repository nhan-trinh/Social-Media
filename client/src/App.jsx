import React, { useRef, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Message from "./pages/Message";
import ChatBox from "./pages/ChatBox";
import Connections from "./pages/Connections";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import CreatePost from "./pages/CreatePost";
import { useUser, useAuth } from "@clerk/clerk-react";
import Layout from "./layout/Layout";
import { Toaster, toast } from "react-hot-toast";
import NotFound from "./layout/404NotFound";
import { useDispatch } from "react-redux";
import { fetchUser } from "./features/user/userSlice";
import { fetchConnections } from "./features/connections/connectionSlice";
import { addMessage } from "./features/messages/messagesSlice";
import Notifications from "./components/Notifications";

const App = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { pathname } = useLocation();
  const pathNameRef = useRef(pathname);
  const dispatch = useDispatch();

  // Lấy thông tin user + connections khi user thay đổi
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const token = await getToken();
        dispatch(fetchUser(token));
        dispatch(fetchConnections(token));
      }
    };
    fetchData();
  }, [user, getToken, dispatch]);

  // Theo dõi thay đổi path
  useEffect(() => {
    pathNameRef.current = pathname;
  }, [pathname]);

  // Kết nối SSE để nhận tin nhắn real-time
  useEffect(() => {
    if (!user?.id) return;

    let eventSource;
    let retryCount = 0;
    const maxRetries = 3;

    const connectSSE = () => {
      try {
        const eventSourceUrl = `${import.meta.env.VITE_BASEURL}/api/message/${user.id}`;
        eventSource = new EventSource(eventSourceUrl);

        eventSource.onopen = () => {
          console.log('SSE Connected successfully');
          retryCount = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            console.log('Raw SSE data:', event.data);
            const response = JSON.parse(event.data);

            // Xử lý tin nhắn mới
            if (response.type === 'new_message' && response.data) {
              const message = response.data;
              console.log('New message received:', message);

              // Thêm tin nhắn vào store
              dispatch(addMessage(message));

              // Lấy senderId
              const senderId = typeof message.from_user_id === "object" 
                ? message.from_user_id._id 
                : message.from_user_id;

              // Hiện toast nếu không ở trong chat với người gửi
              if (pathNameRef.current !== `/messages/${senderId}`) {
                // Sử dụng custom notification component
                toast.custom((t) => (
                  <Notifications t={t} message={message} />
                ), {
                  duration: 5000,
                  position: "bottom-right"
                });
              }
            }
            // Xử lý connection message
            else if (response.type === 'connection') {
              console.log('SSE connection established:', response.message);
            }
          } catch (parseError) {
            console.error("Error parsing SSE message:", parseError, event.data);
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE Error:", error);
          eventSource.close();
          
          // Retry connection
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying SSE connection... (${retryCount}/${maxRetries})`);
            setTimeout(connectSSE, 2000 * retryCount);
          } else {
            console.error('Max retries reached. SSE connection failed.');
          }
        };

      } catch (error) {
        console.error('Failed to create SSE connection:', error);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        console.log('Closing SSE connection');
        eventSource.close();
      }
    };
  }, [user?.id, dispatch]);

  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path="messages" element={<Message />} />
          <Route path="messages/:userId" element={<ChatBox />} />
          <Route path="connections" element={<Connections />} />
          <Route path="discover" element={<Discover />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:profileId" element={<Profile />} />
          <Route path="create-post" element={<CreatePost />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;