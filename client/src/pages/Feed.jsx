import { useEffect, useState } from "react";
import { dummyPostsData } from "../assets/assets";
import Loading from "../components/Loading";
import StoriesBar from "../components/StoriesBar";

const Feed = () => {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        setFeeds(dummyPostsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching feeds:", error);
      }
    };

    fetchFeeds();
  }, []);

  return !loading ? (
    <div className="h-full overflow-y-scroll no-scrollbar py-10 xl:pr-5 flex items-start justify-center xl:gap-8">
      {/* Stories and PostLists */}
      <div>
        <StoriesBar />
        <div className="p-4 space-y-6">
          {feeds.map((feed) => (
            <div key={feed._id} className="rounded-xl bg-white p-4 shadow-sm">
              <p className="font-semibold">{feed.user.full_name}</p>
              <p className="mt-2 text-gray-700">
                {feed.content || "Image post"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* right sidebar */}
      <div>
        <div>
          <h1>Sponsored</h1>
        </div>
        <h1>Recent Messages</h1>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default Feed;
