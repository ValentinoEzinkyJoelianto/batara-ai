import { useEffect, useState } from 'react';
import BlocklyViewer from './BlocklyViewer';
import { thumbColors } from './cardThumb';
import * as api from './api';

export default function GalleryView({ token, onBack }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [sort, setSort] = useState('likes');

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
      <div>
        <div className="navbar">
          <div className="navbar-logo">{viewing.title}</div>
          <div className="navbar-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setViewing(null)}>
              ← Back to gallery
            </button>
          </div>
        </div>
        <div className="page">
          <p className="text-secondary">by {viewing.owner_name}</p>
          {viewing.description && <p>{viewing.description}</p>}
          <div className="card card-padded">
            <BlocklyViewer workspaceState={viewing.workspace_json} />
          </div>
        </div>
      </div>
    );
  }

  const sortedProjects = [...projects].sort((a, b) =>
    sort === 'likes'
      ? b.like_count - a.like_count
      : new Date(b.created_at) - new Date(a.created_at)
  );

  return (
    <div>
      <div className="navbar">
        <div className="navbar-logo">BATARA-AI</div>
        <div className="navbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={onBack}>
            Back to my projects
          </button>
        </div>
      </div>

      <div className="page">
        <div className="section-header">
          <h1>Project <span className="highlight">Gallery</span></h1>
        </div>

        <div className="pill-row">
          <button className={`pill ${sort === 'likes' ? 'pill-active' : ''}`} onClick={() => setSort('likes')}>
            Most Liked
          </button>
          <button className={`pill ${sort === 'recent' ? 'pill-active' : ''}`} onClick={() => setSort('recent')}>
            Recent
          </button>
        </div>

        {loading && <p className="text-secondary">Loading…</p>}
        {!loading && projects.length === 0 && (
          <div className="card empty-state">No published projects yet.</div>
        )}

        <div className="card-grid">
          {sortedProjects.map((p) => {
            const [thumbA, thumbB] = thumbColors(p.id);
            return (
              <div key={p.id} className="card card-hover card-with-thumb">
                <div
                  className="card-thumb"
                  style={{ '--thumb-a': thumbA, '--thumb-b': thumbB, cursor: 'pointer' }}
                  onClick={() => setViewing(p)}
                >
                  <span className="card-thumb-letter">{p.title.charAt(0).toUpperCase()}</span>
                  <button
                    className="badge badge-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(p);
                    }}
                  >
                    {p.liked_by_me ? '♥' : '♡'} {p.like_count}
                  </button>
                </div>
                <div className="card-body" style={{ cursor: 'pointer' }} onClick={() => setViewing(p)}>
                  <h3 style={{ margin: '0 0 0.3rem' }}>{p.title}</h3>
                  <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>
                    by {p.owner_name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}