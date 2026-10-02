import { useEffect, useRef, useState } from 'react';
import BlocklyEditor from './BlocklyEditor';
import ArduinoSimulator from './ArduinoSimulator';
import InstructorDashboard from './InstructorDashboard';
import GalleryView from './GalleryView';
import ForumView from './ForumView';
import * as api from './api';
import { thumbColors } from './cardThumb';
import './App.css';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const [user, setUser] = useState(null);
  const [showInstructorDashboard, setShowInstructorDashboard] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showForum, setShowForum] = useState(false);

  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [runTrigger, setRunTrigger] = useState(0);
  const [runCode, setRunCode] = useState('');
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [projectReviews, setProjectReviews] = useState([]);

  const latestWorkspace = useRef({ state: null, code: '' });

  useEffect(() => {
    if (token) {
      refreshProjects();
      api.getMe(token).then(setUser).catch(() => {});
      api.listClassesImEnrolledIn(token).then(setEnrolledClasses).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (selectedProject) {
      api
        .listReviews(token, selectedProject.id)
        .then(setProjectReviews)
        .catch(() => setProjectReviews([]));
    } else {
      setProjectReviews([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id]);

  async function refreshProjects() {
    try {
      const data = await api.listMyProjects(token);
      setProjects(data);
    } catch (err) {
      handleLogout();
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        await api.register(form);
        setAuthMode('login');
        setAuthError('Registered! Now log in below.');
        return;
      }
      const { access_token } = await api.login(form);
      localStorage.setItem('token', access_token);
      setToken(access_token);
    } catch (err) {
      setAuthError(err.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setProjects([]);
    setSelectedProject(null);
    setShowInstructorDashboard(false);
    setShowGallery(false);
    setShowForum(false);
  }

  async function handleNewProject() {
    const title = window.prompt('Project title?', 'Untitled project');
    if (!title) return;
    const project = await api.createProject(token, { title, workspace_json: {} });
    await refreshProjects();
    setSelectedProject(project);
  }

  function handleWorkspaceChange({ state, code }) {
    latestWorkspace.current = { state, code };
  }

  function applyProjectUpdate(updated) {
    setSelectedProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }
  
  async function handleDeleteProject(project) {
    if (
      !window.confirm(
        `Delete "${project.title}"? This can't be undone — any reviews or gallery likes on it will be removed too.`
      )
    ) {
      return;
    }
    try {
      await api.deleteProject(token, project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      setSaveStatus('Error: ' + err.message);
    }
  }

  async function handleSave() {
    if (!selectedProject) return;
    setSaveStatus('Saving...');
    try {
      const { state, code } = latestWorkspace.current;
      const updated = await api.updateProject(token, selectedProject.id, {
        workspace_json: state || {},
        generated_code: code || '',
      });
      applyProjectUpdate(updated);
      setSaveStatus('Saved at ' + new Date().toLocaleTimeString());
    } catch (err) {
      setSaveStatus('Error: ' + err.message);
    }
  }

  function handleRun() {
    setRunCode(latestWorkspace.current.code || '');
    setRunTrigger((n) => n + 1);
  }

  async function handleAssignClass(e) {
    const classId = e.target.value || null;
    if (!selectedProject) return;
    try {
      const updated = await api.updateProject(token, selectedProject.id, { class_id: classId });
      applyProjectUpdate(updated);
    } catch (err) {
      setSaveStatus('Error: ' + err.message);
    }
  }

  async function handleTogglePublish() {
    if (!selectedProject) return;
    try {
      const updated = await api.updateProject(token, selectedProject.id, {
        is_published: !selectedProject.is_published,
      });
      applyProjectUpdate(updated);
    } catch (err) {
      setSaveStatus('Error: ' + err.message);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">BATARA-AI</div>
        <form onSubmit={handleAuthSubmit}>
          {authMode === 'register' && (
            <div className="field">
              <label>Name</label>
              <input
                className="input"
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            {authMode === 'login' ? 'Log in' : 'Register'}
          </button>
        </form>
        {authError && <p className="text-error" style={{ marginTop: '0.75rem' }}>{authError}</p>}
        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <button
            className="link-muted"
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login');
              setAuthError('');
            }}
          >
            {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
      </div>
    );
  }

  if (showInstructorDashboard) {
    return <InstructorDashboard token={token} onBack={() => setShowInstructorDashboard(false)} />;
  }

  if (showGallery) {
    return <GalleryView token={token} onBack={() => setShowGallery(false)} />;
  }

  if (showForum) {
    return <ForumView token={token} onBack={() => setShowForum(false)} />;
  }

  if (!selectedProject) {
    const isInstructor = user && (user.role === 'instructor' || user.role === 'admin');
    return (
      <div>
        <div className="navbar">
          <div className="navbar-logo">BATARA-AI</div>
          <div className="navbar-menu">
            {isInstructor && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowInstructorDashboard(true)}>
                Instructor Dashboard
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => setShowGallery(true)}>
              Gallery
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowForum(true)}>
              Forum
            </button>
          </div>
          <div className="navbar-actions">
            <button className="btn btn-danger-outline btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>

        <div className="page">
          <div className="section-header">
            <h1>Your <span className="highlight">Projects</span></h1>
            <button className="btn btn-primary" onClick={handleNewProject}>
              + New project
            </button>
          </div>

          <div className="pill-row">
            <button className={`pill ${projectFilter === 'all' ? 'pill-active' : ''}`} onClick={() => setProjectFilter('all')}>
              All
            </button>
            <button className={`pill ${projectFilter === 'published' ? 'pill-active' : ''}`} onClick={() => setProjectFilter('published')}>
              Published
            </button>
            <button className={`pill ${projectFilter === 'draft' ? 'pill-active' : ''}`} onClick={() => setProjectFilter('draft')}>
              Not Published
            </button>
          </div>

          {(() => {
            const filtered = projects.filter((p) => {
              if (projectFilter === 'published') return p.is_published;
              if (projectFilter === 'draft') return !p.is_published;
              return true;
            });
            if (projects.length === 0) {
              return <div className="card empty-state">No projects yet — create one to get started.</div>;
            }
            if (filtered.length === 0) {
              return <div className="card empty-state">No projects match this filter.</div>;
            }
            return (
              <div className="card-grid">
                {filtered.map((p) => {
                  const [thumbA, thumbB] = thumbColors(p.id);
                  return (
                    <div
                      key={p.id}
                      className="card card-hover card-with-thumb"
                      onClick={() => setSelectedProject(p)}
                    >
                      <div className="card-thumb" style={{ '--thumb-a': thumbA, '--thumb-b': thumbB }}>
                        <span className="card-thumb-letter">{p.title.charAt(0).toUpperCase()}</span>
                        {p.is_published && <span className="badge">Published</span>}
                      </div>
                      <div className="card-body">
                        <h3 style={{ margin: 0 }}>{p.title}</h3>
                        {p.class_id && (
                          <span className="badge badge-muted" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                            In a class
                          </span>
                        )}
                        <div style={{ marginTop: '0.7rem' }}>
                          <button
                            className="btn btn-danger-outline btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(p);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="navbar">
        <div className="navbar-logo">{selectedProject.title}</div>
        <div className="navbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedProject(null)}>
            Back to projects
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleRun}>
            Run
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>

      <div className="page">
        <div className="card card-padded" style={{ marginBottom: '1rem' }}>
          {enrolledClasses.length > 0 && (
            <div className="field" style={{ marginBottom: '0.75rem' }}>
              <label>Submit to class</label>
              <select className="input" value={selectedProject.class_id || ''} onChange={handleAssignClass}>
                <option value="">— Not assigned —</option>
                {enrolledClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
            <input type="checkbox" checked={selectedProject.is_published} onChange={handleTogglePublish} />
            Publish to Gallery
          </label>
          {saveStatus && <p className="text-secondary" style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>{saveStatus}</p>}
        </div>

        {selectedProject.class_id && (
          <div className="card card-padded" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <h2 style={{ margin: 0 }}>Instructor <span className="highlight">feedback</span></h2>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  api
                    .listReviews(token, selectedProject.id)
                    .then(setProjectReviews)
                    .catch(() => {})
                }
              >
                Refresh
              </button>
            </div>
            {projectReviews.length === 0 ? (
              <p className="text-secondary">No feedback yet.</p>
            ) : (
              projectReviews.map((r) => (
                <div key={r.id} className="post">
                  <span className="badge badge-muted">{r.status}</span>
                  <p style={{ margin: '0.4rem 0 0.2rem' }}>{r.comment || '(no comment)'}</p>
                  <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        <div className="card card-padded">
          <BlocklyEditor
            key={selectedProject.id}
            initialState={selectedProject.workspace_json}
            onChange={handleWorkspaceChange}
          />
          <ArduinoSimulator code={runCode} runTrigger={runTrigger} />
        </div>
      </div>
    </div>
  );
}

export default App;