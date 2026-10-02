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
  const [classSort, setClassSort] = useState('name');
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
      <div>
        <div className="navbar">
          <div className="navbar-logo">{reviewingProject.title}</div>
          <div className="navbar-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setReviewingProject(null)}>
              Back to class
            </button>
          </div>
        </div>

        <div className="page-narrow">
          <p className="text-secondary">
            By {reviewingProject.owner_name} ({reviewingProject.owner_email})
          </p>

          <div className="section-header" style={{ marginTop: '1.5rem' }}>
            <h2>Blocks</h2>
          </div>
          <div className="card card-padded" style={{ marginBottom: '1.5rem' }}>
            <BlocklyViewer workspaceState={projectDetail && projectDetail.workspace_json} />
          </div>

          <div className="section-header">
            <h2>Generated <span className="highlight">code</span></h2>
          </div>
          <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
            <pre
              style={{
                background: '#1e1e1e',
                color: '#d4d4d4',
                padding: '1rem',
                margin: 0,
                fontSize: '13px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {(projectDetail && projectDetail.generated_code) || '(no code generated yet)'}
            </pre>
          </div>

          <div className="section-header">
            <h2>Submit a <span className="highlight">review</span></h2>
          </div>
          <div className="card card-padded" style={{ marginBottom: '1.5rem' }}>
            <form onSubmit={handleSubmitReview}>
              <div className="field">
                <label>Status</label>
                <select className="input" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                  {REVIEW_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Comment (optional)</label>
                <textarea
                  className="input"
                  placeholder="Leave feedback for the student..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Submit review
              </button>
            </form>
            {statusMsg && <p className="text-success" style={{ marginBottom: 0 }}>{statusMsg}</p>}
            {errorMsg && <p className="text-error" style={{ marginBottom: 0 }}>{errorMsg}</p>}
          </div>

          <div className="section-header">
            <h2>Review <span className="highlight">history</span></h2>
          </div>
          {reviews.length === 0 ? (
            <div className="card empty-state">No reviews yet.</div>
          ) : (
            <div className="card card-padded">
              {reviews.map((r) => (
                <div key={r.id} className="post">
                  <span className="badge badge-muted">{r.status}</span>
                  <p style={{ margin: '0.4rem 0 0.2rem' }}>{r.comment || '(no comment)'}</p>
                  <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedClass) {
    return (
      <div>
        <div className="navbar">
          <div className="navbar-logo">{selectedClass.name}</div>
          <div className="navbar-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedClass(null)}>
              Back to classes
            </button>
          </div>
        </div>

        <div className="page-narrow">
          <div className="card card-padded" style={{ marginBottom: '1.5rem' }}>
            <form onSubmit={handleEnroll} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="input"
                type="email"
                placeholder="Student's email"
                value={enrollEmail}
                onChange={(e) => setEnrollEmail(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary">
                Enroll
              </button>
            </form>
            {statusMsg && <p className="text-success" style={{ margin: '0.5rem 0 0' }}>{statusMsg}</p>}
            {errorMsg && <p className="text-error" style={{ margin: '0.5rem 0 0' }}>{errorMsg}</p>}
          </div>

          <div className="section-header">
            <h2>Roster <span className="highlight">({roster.length})</span></h2>
          </div>
          {roster.length === 0 ? (
            <div className="card empty-state">No students enrolled yet.</div>
          ) : (
            roster.map((s) => (
              <div key={s.id} className="list-row">
                <span>
                  {s.name} — {s.email}
                </span>
                <button className="btn btn-danger-outline btn-sm" onClick={() => handleUnenroll(s.id)}>
                  Remove
                </button>
              </div>
            ))
          )}

          <div className="section-header" style={{ marginTop: '1.5rem' }}>
            <h2>Submitted <span className="highlight">projects ({classProjects.length})</span></h2>
          </div>
          {classProjects.length === 0 ? (
            <div className="card empty-state">No projects submitted to this class yet.</div>
          ) : (
            classProjects.map((p) => (
              <div
                key={p.id}
                className="list-row list-row-clickable"
                onClick={() => openProjectForReview(p)}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{p.title}</div>
                  <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{p.owner_name}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="navbar">
        <div className="navbar-logo">BATARA-AI</div>
        <div className="navbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={onBack}>
            Back to projects
          </button>
        </div>
      </div>

      <div className="page-narrow">
        <div className="section-header">
          <h1>Your <span className="highlight">Classes</span></h1>
        </div>

        <div className="card card-padded" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleCreateClass} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder="New class name"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">
              Create class
            </button>
          </form>
          {errorMsg && <p className="text-error" style={{ margin: '0.5rem 0 0' }}>{errorMsg}</p>}
        </div>

                {classes.length > 0 && (
          <div className="pill-row">
            <button className={`pill ${classSort === 'name' ? 'pill-active' : ''}`} onClick={() => setClassSort('name')}>
              Name
            </button>
            <button className={`pill ${classSort === 'recent' ? 'pill-active' : ''}`} onClick={() => setClassSort('recent')}>
              Newest
            </button>
          </div>
        )}

        {classes.length === 0 ? (
          <div className="card empty-state">No classes yet — create one above.</div>
        ) : (
          [...classes]
            .sort((a, b) =>
              classSort === 'name' ? a.name.localeCompare(b.name) : new Date(b.created_at) - new Date(a.created_at)
            )
            .map((c) => (
              <div key={c.id} className="list-row">
                <span
                  style={{ fontWeight: 600, cursor: 'pointer', flex: 1 }}
                  onClick={() => openClass(c)}
                >
                  {c.name}
                </span>
                <button className="btn btn-danger-outline btn-sm" onClick={() => handleDeleteClass(c.id)}>
                  Delete
                </button>
              </div>
            ))
        )}
      </div>
    </div>
  );
}