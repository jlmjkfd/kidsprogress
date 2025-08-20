import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "../../store";
import { Link, useParams } from "react-router-dom";
import {
  fetchWritingById,
  selectWritingDetail,
  selectWritingLoading,
} from "../../store/modules/writingSlice";
import { useEffect } from "react";

function WritingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const writingDetail = useSelector(selectWritingDetail(id));
  const loading = useSelector(selectWritingLoading);

  useEffect(() => {
    if (id && !writingDetail) {
      dispatch(fetchWritingById(id));
    }
  }, [id, writingDetail, dispatch]);
  if (!id) return <div>Invalid writing id</div>;
  if (loading && !writingDetail) return <div>Loading...</div>;
  if (!writingDetail) return <div>Not Found</div>;
  return (
    <div className="p-4">
      <div>
        <Link to={"/writing"}>&lt;&lt;Back</Link>
      </div>
      <h1>{writingDetail.title}</h1>
      <p>{new Date(writingDetail.date).toLocaleDateString()}</p>
      <div className="whitespace-pre-wrap">{writingDetail.text}</div>
      <h2>Overall Score: {writingDetail.overall_score}</h2>
      <h3>Rubric Score</h3>
      {/* <ul>
          {Object.entries(writingDetail.rubric_scores).map(([key, val]) => (
            <li key={key}>
              {key}: {val}
            </li>
          ))}
        </ul> */}
      <h3>Evaluation</h3>
      <p>{writingDetail.feedback_student}</p>
      <h3>Improved Version</h3>
      <div className="whitespace-pre-wrap">{writingDetail.improved_text}</div>
    </div>
  );
}
export default WritingDetailPage;
