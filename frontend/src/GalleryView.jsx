import { useEffect, useState } from 'react';
import BlocklyViewer from './BlocklyViewer';
import * as api from './api';

export default function GalleryView({ token, onBack }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const data = await api.listGallery(token);
      setProjects(data);
    } catch (err) {
      // leave projects as-is on error
    }
    setLoading(false);
  }

  async function toggleLike(project) {
    try {
      if (project.liked_by_me) {
        await api.unlikeProject(token, project.id);
      } else {
        await api.likeProject(token, project.id);
      }
      await refresh();
    } catch (err) {
      // ignore for now
    }
  }

  if (viewing) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <button onClick={() => setViewing(null)} style={{ marginBottom: '1rem' }}>
          ← Back to gallery
        </button>
        <h1>{viewing.title}</h1>
        <p style={{ color: '#666' }}>by {viewing.owner_name}</p>
        {viewing.description && <p>{viewing.description}</p>}
        <BlocklyViewer workspaceState={viewing.workspace_json} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Gallery</h1>
        <button onClick={onBack}>Back to my projects</button>
      </div>
      {loading && <p>Loading…</p>}
      {!loading && projects.length === 0 && <p>No published projects yet.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {projects.map((p) => (
          <div key={p.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem' }}>
            <h3 style={{ marginTop: 0, cursor: 'pointer' }} onClick={() => setViewing(p)}>
              {p.title}
            </h3>
            <p style={{ fontSize: '13px', color: '#666' }}>by {p.owner_name}</p>
            {p.description && <p style={{ fontSize: '14px' }}>{p.description}</p>}
            <button onClick={() => toggleLike(p)}>
              {p.liked_by_me ? '♥' : '♡'} {p.like_count}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}