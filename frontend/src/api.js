const API_BASE = 'http://localhost:8000';

async function handleResponse(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // response wasn't JSON — keep statusText
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return res.status === 204 ? null : res.json();
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function register({ name, email, password }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(res);
}

export async function login({ email, password }) {
  const body = new URLSearchParams();
  body.set('username', email);
  body.set('password', password);

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return handleResponse(res);
}

export async function getMe(token) {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function listMyProjects(token) {
  const res = await fetch(`${API_BASE}/projects/me`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function createProject(token, payload) {
  const res = await fetch(`${API_BASE}/projects/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function getProject(token, id) {
  const res = await fetch(`${API_BASE}/projects/${id}`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function updateProject(token, id, payload) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function listMyClasses(token) {
  const res = await fetch(`${API_BASE}/classes/mine`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function createClass(token, payload) {
  const res = await fetch(`${API_BASE}/classes/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function deleteClass(token, classId) {
  const res = await fetch(`${API_BASE}/classes/${classId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function enrollStudent(token, classId, studentEmail) {
  const res = await fetch(`${API_BASE}/classes/${classId}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ student_email: studentEmail }),
  });
  return handleResponse(res);
}

export async function getClassStudents(token, classId) {
  const res = await fetch(`${API_BASE}/classes/${classId}/students`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function unenrollStudent(token, classId, studentId) {
  const res = await fetch(`${API_BASE}/classes/${classId}/enroll/${studentId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function listClassesImEnrolledIn(token) {
  const res = await fetch(`${API_BASE}/classes/enrolled-in`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function listClassProjects(token, classId) {
  const res = await fetch(`${API_BASE}/classes/${classId}/projects`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function createReview(token, projectId, payload) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function listReviews(token, projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/reviews`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function listGallery(token) {
  const res = await fetch(`${API_BASE}/projects/gallery`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function likeProject(token, projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/like`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function unlikeProject(token, projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/like`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function listThreads(token, projectId) {
  const url = projectId
    ? `${API_BASE}/forum/threads?project_id=${projectId}`
    : `${API_BASE}/forum/threads`;
  const res = await fetch(url, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function createThread(token, payload) {
  const res = await fetch(`${API_BASE}/forum/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function listPosts(token, threadId) {
  const res = await fetch(`${API_BASE}/forum/threads/${threadId}/posts`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function createPost(token, threadId, payload) {
  const res = await fetch(`${API_BASE}/forum/threads/${threadId}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}