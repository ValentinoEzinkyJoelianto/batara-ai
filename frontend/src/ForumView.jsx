import { useEffect, useState } from 'react';
import * as api from './api';

export default function ForumView({ token, onBack }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    refreshThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshThreads() {
    setLoading(true);
    try {
      const data = await api.listThreads(token);
      setThreads(data);
    } catch (err) {
      // leave threads as-is on error
    }
    setLoading(false);
  }

  async function openThread(thread) {
    setActiveThread(thread);
    try {
      const data = await api.listPosts(token, thread.id);
      setPosts(data);
    } catch (err) {
      setPosts([]);
    }
  }

  async function handleNewThread() {
    const title = window.prompt('Thread title?');
    if (!title) return;
    try {
      await api.createThread(token, { title });
      await refreshThreads();
    } catch (err) {
      // ignore for now
    }
  }

  async function handlePostReply() {
    if (!newPostContent.trim() || !activeThread) return;
    try {
      await api.createPost(token, activeThread.id, { content: newPostContent });
      setNewPostContent('');
      const data = await api.listPosts(token, activeThread.id);
      setPosts(data);
    } catch (err) {
      // ignore for now
    }
  }

  if (activeThread) {
    return (
      <div>
        <div className="navbar">
          <div className="navbar-logo">{activeThread.title}</div>
          <div className="navbar-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveThread(null)}>
              ← Back to threads
            </button>
          </div>
        </div>

        <div className="page-narrow">
          <div className="card card-padded">
            {posts.length === 0 && <p className="text-secondary">No replies yet — be the first.</p>}
            {posts.map((p) => (
              <div key={p.id} className="post">
                <strong>{p.author_name}</strong>
                <span className="text-secondary" style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                  {new Date(p.created_at).toLocaleString()}
                </span>
                <p style={{ margin: '0.3rem 0 0' }}>{p.content}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Write a reply..."
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handlePostReply}>
              Reply
            </button>
          </div>
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
            Back to my projects
          </button>
        </div>
      </div>

      <div className="page-narrow">
        <div className="section-header">
          <h1>Community <span className="highlight">Forum</span></h1>
          <button className="btn btn-primary" onClick={handleNewThread}>
            + New thread
          </button>
        </div>

        <div className="pill-row">
          <button className={`pill ${sort === 'recent' ? 'pill-active' : ''}`} onClick={() => setSort('recent')}>
            Recent
          </button>
          <button className={`pill ${sort === 'replies' ? 'pill-active' : ''}`} onClick={() => setSort('replies')}>
            Most Replies
          </button>
        </div>

        {loading && <p className="text-secondary">Loading…</p>}
        {!loading && threads.length === 0 && (
          <div className="card empty-state">No discussions yet — start one.</div>
        )}

        {[...threads]
          .sort((a, b) =>
            sort === 'replies' ? b.post_count - a.post_count : new Date(b.created_at) - new Date(a.created_at)
          )
          .map((t) => (
            <div
              key={t.id}
              className="list-row list-row-clickable"
              onClick={() => openThread(t)}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{t.title}</div>
                <div className="text-secondary" style={{ fontSize: '0.8rem' }}>
                  by {t.author_name}
                </div>
              </div>
              <span className="badge badge-muted">
                {t.post_count} {t.post_count === 1 ? 'reply' : 'replies'}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}