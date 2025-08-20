import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { AppDispatch } from "../../store";
import { useEffect } from "react";
import {
  fetchWritings,
  selectWritingLoading,
  selectWritings,
  selectWritingViewMode,
  setViewMode,
} from "../../store/modules/writingSlice";

function WritingListPage() {
  const dispatch = useDispatch<AppDispatch>();
  //   const { writings, loading, viewMode } = useSelector(
  //     (state: RootState) => state.writings
  //   );
  const writings = useSelector(selectWritings);
  const loading = useSelector(selectWritingLoading);
  const viewMode = useSelector(selectWritingViewMode);

  useEffect(() => {
    dispatch(fetchWritings());
  }, [dispatch]);
  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      {/* view mode switch */}
      <div className="flex justify-between mb-4">
        <button onClick={() => dispatch(setViewMode("grid"))}>Grid</button>
        <button onClick={() => dispatch(setViewMode("list"))}>List</button>
        <Link to={"/writing/create"}>Create New Writing</Link>
      </div>

      {/* list */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-3 gap-4">
          {writings.map((w) => (
            <Link
              key={w._id}
              to={`/writing/${w._id}`}
              className="border p-4 rounded shadow"
            >
              <h3>{w.title}</h3>
              <p>{new Date(w.date).toLocaleDateString()}</p>
              <p>{w.text.slice(0, 50)}...</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {writings.map((w) => (
            <Link
              key={w._id}
              to={`/writing/${w._id}`}
              className="border p-2 rounded shadow flex flex-col"
            >
              <h3>{w.title}</h3>
              <span>{new Date(w.date).toLocaleDateString()}</span>
              <p>{w.text.slice(0, 50)}...</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default WritingListPage;
