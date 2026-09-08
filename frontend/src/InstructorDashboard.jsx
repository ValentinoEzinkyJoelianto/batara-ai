import { useEffect, useState } from 'react';
import * as api from './api';
import BlocklyViewer from './BlocklyViewer';

const REVIEW_STATUSES = ['pending', 'reviewed', 'needs_revision', 'approved'];

export default function InstructorDashboard({ token, onBack }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [roster, setRoster] = useState([]);
  const [classProjects, setClassProjects] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [reviewingProject, setReviewingProject] = useState(null);
  const [projectDetail, setProjectDetail] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewStatus, setReviewStatus] = useState('reviewed');
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    refreshClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshClasses() {
    try {
      const data = await api.listMyClasses(token);
      setClasses(data);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function handleCreateClass(e) {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setErrorMsg('');
    try {
      await api.createClass(token, { name: newClassName });
      setNewClassName('');
      await refreshClasses();
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function handleDeleteClass(classId) {
    if (
      !window.confirm(
        'Delete this class? Enrollments will be removed; student projects stay, just unlinked from the class.'
      )
    ) {
      return;
    }
    setErrorMsg('');
    try {
      await api.deleteClass(token, classId);
      await refreshClasses();
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function openClass(classItem) {
    setSelectedClass(classItem);
    setErrorMsg('');
    try {
      const [students, projects] = await Promise.all([
        api.getClassStudents(token, classItem.id),
        api.listClassProjects(token, classItem.id),
      ]);
      setRoster(students);
      setClassProjects(projects);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function handleEnroll(e) {
    e.preventDefault();
    if (!enrollEmail.trim() || !selectedClass) return;
    setErrorMsg('');
    setStatusMsg('');
    try {
      await api.enrollStudent(token, selectedClass.id, enrollEmail);
      setEnrollEmail('');
      setStatusMsg('Enrolled successfully.');
      const students = await api.getClassStudents(token, selectedClass.id);
      setRoster(students);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function handleUnenroll(studentId) {
    if (!selectedClass) return;
    if (!window.confirm('Remove this student from the class?')) return;
    setErrorMsg('');
    setStatusMsg('');
    try {
      await api.unenrollStudent(token, selectedClass.id, studentId);
      setStatusMsg('Student removed.');
      const students = await api.getClassStudents(token, selectedClass.id);
      setRoster(students);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function openProjectForReview(project) {
    setReviewingProject(project);
    setErrorMsg('');
    try {
      const [detail, reviewList] = await Promise.all([
        api.getProject(token, project.id),
        api.listReviews(token, project.id),
      ]);
      setProjectDetail(detail);
      setReviews(reviewList);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!reviewingProject) return;
    setErrorMsg('');
    setStatusMsg('');
    try {
      await api.createReview(token, reviewingProject.id, {
        status: reviewStatus,
        comment: reviewComment || null,
      });
      setReviewComment('');
      setStatusMsg('Review submitted.');
      const reviewList = await api.listReviews(token, reviewingProject.id);
      setReviews(reviewList);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  if (reviewingProject) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1rem' }}>
        <button onClick={() => setReviewingProject(null)} style={{ marginBottom: '1rem' }}>
          Back to class
        </button>
        <h1>{reviewingProject.title}</h1>
        <p>
          By {reviewingProject.owner_name} ({reviewingProject.owner_email})
        </p>
        <h2>Blocks</h2>
        <BlocklyViewer workspaceState={projectDetail && projectDetail.workspace_json} />
        <h2>Generated code</h2>
        <pre
          style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '13px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {(projectDetail && projectDetail.generated_code) || '(no code generated yet)'}
        </pre>

        <h2>Submit a review</h2>
        <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '500px' }}>
          <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Comment (optional)"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            rows={3}
          />
          <button type="submit">Submit review</button>
        </form>
        {statusMsg && <p style={{ color: 'green' }}>{statusMsg}</p>}
        {errorMsg && <p style={{ color: 'crimson' }}>{errorMsg}</p>}

        <h2>Review history</h2>
        <ul>
          {reviews.map((r) => (
            <li key={r.id} style={{ marginBottom: '0.5rem' }}>
              <strong>{r.status}</strong> — {r.comment || '(no comment)'}
              <br />
              <span style={{ fontSize: '12px', color: '#888' }}>
                {new Date(r.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        {reviews.length === 0 && <p>No reviews yet.</p>}
      </div>
    );
  }

  if (selectedClass) {
    return (
      <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '1rem' }}>
        <button onClick={() => setSelectedClass(null)} style={{ marginBottom: '1rem' }}>
          Back to classes
        </button>
        <h1>{selectedClass.name}</h1>

        <form onSubmit={handleEnroll} style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
          <input
            type="email"
            placeholder="Student's email"
            value={enrollEmail}
            onChange={(e) => setEnrollEmail(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit">Enroll</button>
        </form>
        {statusMsg && <p style={{ color: 'green' }}>{statusMsg}</p>}
        {errorMsg && <p style={{ color: 'crimson' }}>{errorMsg}</p>}

        <h2>Roster ({roster.length})</h2>
        <ul>
          {roster.map((s) => (
            <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span>
                {s.name} — {s.email}
              </span>
              <button onClick={() => handleUnenroll(s.id)} style={{ fontSize: '12px' }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        {roster.length === 0 && <p>No students enrolled yet.</p>}

        <h2>Submitted projects ({classProjects.length})</h2>
        <ul>
          {classProjects.map((p) => (
            <li key={p.id} style={{ marginBottom: '0.5rem' }}>
              <button onClick={() => openProjectForReview(p)}>
                {p.title} — {p.owner_name}
              </button>
            </li>
          ))}
        </ul>
        {classProjects.length === 0 && <p>No projects submitted to this class yet.</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '1rem' }}>
      <button onClick={onBack} style={{ marginBottom: '1rem' }}>
        Back to projects
      </button>
      <h1>Your classes</h1>

      <form onSubmit={handleCreateClass} style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        <input
          placeholder="New class name"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit">Create class</button>
      </form>
      {errorMsg && <p style={{ color: 'crimson' }}>{errorMsg}</p>}

      <ul>
        {classes.map((c) => (
          <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button onClick={() => openClass(c)}>{c.name}</button>
            <button onClick={() => handleDeleteClass(c.id)} style={{ fontSize: '12px' }}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      {classes.length === 0 && <p>No classes yet — create one above.</p>}
    </div>
  );
}