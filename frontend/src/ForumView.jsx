import { useEffect, useState } from 'react';
import * as api from './api';

export default function ForumView({ token, onBack }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');

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
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <button onClick={() => setActiveThread(null)} style={{ marginBottom: '1rem' }}>
          ← Back to threads
        </button>
        <h1>{activeThread.title}</h1>
        <div>
          {posts.map((p) => (
            <div key={p.id} style={{ borderBottom: '1px solid #eee', padding: '0.75rem 0' }}>
              <strong>{p.author_name}</strong>
              <span style={{ fontSize: '12px', color: '#888', marginLeft: '0.5rem' }}>
                {new Date(p.created_at).toLocaleString()}
              </span>
              <p style={{ margin: '0.25rem 0 0' }}>{p.content}</p>
            </div>
          ))}
          {posts.length === 0 && <p>No replies yet — be the first.</p>}
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <input
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Write a reply..."
            style={{ flex: 1 }}
          />
          <button onClick={handlePostReply}>Reply</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Forum</h1>
        <button onClick={onBack}>Back to my projects</button>
      </div>
      <button onClick={handleNewThread} style={{ marginBottom: '1rem' }}>
        + New thread
      </button>
      {loading && <p>Loading…</p>}
      {!loading && threads.length === 0 && <p>No discussions yet — start one.</p>}
      <ul>
        {threads.map((t) => (
          <li key={t.id} style={{ marginBottom: '0.5rem' }}>
            <button onClick={() => openThread(t)}>{t.title}</button>
            <span style={{ fontSize: '12px', color: '#888', marginLeft: '0.5rem' }}>
              by {t.author_name} · {t.post_count} {t.post_count === 1 ? 'reply' : 'replies'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}