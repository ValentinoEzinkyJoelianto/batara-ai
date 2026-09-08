import { useEffect, useRef, useState } from 'react';
import BlocklyEditor from './BlocklyEditor';
import ArduinoSimulator from './ArduinoSimulator';
import InstructorDashboard from './InstructorDashboard';
import * as api from './api';
import './App.css';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const [user, setUser] = useState(null);
  const [showInstructorDashboard, setShowInstructorDashboard] = useState(false);

  const [projects, setProjects] = useState([]);
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

  async function handleSave() {
    if (!selectedProject) return;
    setSaveStatus('Saving...');
    try {
      const { state, code } = latestWorkspace.current;
      const updated = await api.updateProject(token, selectedProject.id, {
        workspace_json: state || {},
        generated_code: code || '',
      });
      setSelectedProject(updated);
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
      setSelectedProject(updated);
    } catch (err) {
      setSaveStatus('Error: ' + err.message);
    }
  }

  if (!token) {
    return (
      <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '1rem' }}>
        <h1>BATARA-AI</h1>
        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {authMode === 'register' && (
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button type="submit">{authMode === 'login' ? 'Log in' : 'Register'}</button>
        </form>
        {authError && <p style={{ color: 'crimson' }}>{authError}</p>}
        <button
          onClick={() => {
            setAuthMode(authMode === 'login' ? 'register' : 'login');
            setAuthError('');
          }}
          style={{
            marginTop: '1rem',
            background: 'none',
            border: 'none',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Log in'}
        </button>
      </div>
    );
  }

  if (showInstructorDashboard) {
    return <InstructorDashboard token={token} onBack={() => setShowInstructorDashboard(false)} />;
  }

  if (!selectedProject) {
    const isInstructor = user && (user.role === 'instructor' || user.role === 'admin');
    return (
      <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Your projects</h1>
          <div>
            {isInstructor && (
              <button onClick={() => setShowInstructorDashboard(true)} style={{ marginRight: '0.5rem' }}>
                Instructor Dashboard
              </button>
            )}
            <button onClick={handleLogout}>Log out</button>
          </div>
        </div>
        <button onClick={handleNewProject} style={{ marginBottom: '1rem' }}>
          + New project
        </button>
        <ul>
          {projects.map((p) => (
            <li key={p.id} style={{ marginBottom: '0.5rem' }}>
              <button onClick={() => setSelectedProject(p)}>{p.title}</button>
            </li>
          ))}
        </ul>
        {projects.length === 0 && <p>No projects yet — create one to get started.</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>{selectedProject.title}</h1>
        <div>
          <button onClick={() => setSelectedProject(null)} style={{ marginRight: '0.5rem' }}>
            Back to projects
          </button>
          <button onClick={handleRun} style={{ marginRight: '0.5rem' }}>
            Run
          </button>
          <button onClick={handleSave}>Save</button>
        </div>
      </div>
      {enrolledClasses.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Submit to class:{' '}
            <select value={selectedProject.class_id || ''} onChange={handleAssignClass}>
              <option value="">— Not assigned —</option>
              {enrolledClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {saveStatus && <p>{saveStatus}</p>}

      {selectedProject.class_id && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ margin: 0 }}>Instructor feedback</h2>
            <button
              onClick={() =>
                api
                  .listReviews(token, selectedProject.id)
                  .then(setProjectReviews)
                  .catch(() => {})
              }
              style={{ fontSize: '12px' }}
            >
              Refresh
            </button>
          </div>
          <ul>
            {projectReviews.map((r) => (
              <li key={r.id} style={{ marginBottom: '0.5rem' }}>
                <strong>{r.status}</strong> — {r.comment || '(no comment)'}
                <br />
                <span style={{ fontSize: '12px', color: '#888' }}>
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
          {projectReviews.length === 0 && <p>No feedback yet.</p>}
        </div>
      )}

      <BlocklyEditor
        key={selectedProject.id}
        initialState={selectedProject.workspace_json}
        onChange={handleWorkspaceChange}
      />
      <ArduinoSimulator code={runCode} runTrigger={runTrigger} />
    </div>
  );
}

export default App;