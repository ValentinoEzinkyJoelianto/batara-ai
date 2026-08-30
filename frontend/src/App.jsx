import { useState } from 'react';
import BlocklyEditor from './BlocklyEditor';
import './App.css';

function App() {
  // Later: pull this from GET /projects/{id} when opening an existing project,
  // and push it via PUT /projects/{id} on save (workspace_json + generated_code).
  const [lastSaved, setLastSaved] = useState(null);

  const handleChange = ({ xml, code }) => {
    console.log('workspace changed', { xml, code });
  };

  const handleSaveClick = () => {
    setLastSaved(new Date().toLocaleTimeString());
    // TODO: call the backend's PUT /projects/{id} here once auth/project
    // selection is wired up on this side.
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <h1>BATARA-AI — block editor</h1>
      <button onClick={handleSaveClick} style={{ marginBottom: '1rem' }}>
        Save (not yet wired to backend)
      </button>
      {lastSaved && <span style={{ marginLeft: '1rem' }}>Last clicked: {lastSaved}</span>}
      <BlocklyEditor onChange={handleChange} />
    </div>
  );
}

export default App;
