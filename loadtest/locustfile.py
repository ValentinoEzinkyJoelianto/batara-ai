"""Uji beban BATARA-AI dengan Locust.

Setiap pengguna virtual meniru siswa: masuk (login), melihat daftar project,
membuat atau menyimpan project, membuka Gallery dan Forum.

Akun uji memakai pola loadtest001@example.com ... loadtest0NN@example.com
(NN = POOL). Dibuat otomatis saat pertama dipakai, jadi mudah dibersihkan lewat SQL.
"""
import random

from locust import HttpUser, between, task

POOL = 30                    # jumlah akun uji yang dipakai bergantian
PASSWORD = 'LoadTest#2026'   # password sama untuk semua akun uji

# Isi project contoh (mirip hasil Save: blok Blockly + rangkaian)
WORKSPACE = {
    'blocks': {
        'languageVersion': 0,
        'blocks': [{
            'type': 'event_when_start', 'x': 20, 'y': 20,
            'next': {'block': {
                'type': 'arduino_pin_mode', 'fields': {'PIN': '13', 'MODE': 'OUTPUT'},
                'next': {'block': {
                    'type': 'control_forever',
                    'inputs': {'DO': {'block': {
                        'type': 'arduino_digital_write', 'fields': {'PIN': '13', 'STATE': 'HIGH'},
                        'next': {'block': {'type': 'arduino_delay', 'inputs': {'MS': {'block': {'type': 'math_number', 'fields': {'NUM': 500}}}}}},
                    }}},
                }},
            }},
        }],
    },
    '__circuit': {'parts': [], 'wires': []},
}
CODE = "pinMode(13, 'OUTPUT')\nwhile True:\n    digitalWrite(13, 'HIGH')\n    delay(500)\n"


class BataraUser(HttpUser):
    wait_time = between(1, 4)   # jeda berpikir antar aksi

    def on_start(self):
        self.n = random.randint(1, POOL)
        self.email = f'loadtest{self.n:03d}@example.com'
        self.headers = {}
        self.project_id = None
        self._masuk()

    # ---------- login (daftar dulu kalau akun belum ada) ----------
    def _login_sekali(self):
        with self.client.post(
            '/auth/login', data={'username': self.email, 'password': PASSWORD},
            name='POST /auth/login', catch_response=True,
        ) as r:
            if r.status_code == 200:
                self.headers = {'Authorization': 'Bearer ' + r.json()['access_token']}
                r.success()
                return True
            if r.status_code == 401:
                r.success()   # akun belum ada: wajar pada pemakaian pertama
                return False
            r.failure(f'login status {r.status_code}')
            return False

    def _masuk(self):
        if self._login_sekali():
            return
        with self.client.post(
            '/auth/register', json={'name': f'Load Test {self.n}', 'email': self.email, 'password': PASSWORD},
            name='POST /auth/register', catch_response=True,
        ) as r:
            if r.status_code in (201, 400):   # 400 = sudah didaftarkan pengguna virtual lain
                r.success()
            else:
                r.failure(f'register status {r.status_code}')
        self._login_sekali()

    # ---------- aksi pengguna ----------
    @task(5)
    def daftar_project(self):
        self.client.get('/projects/me', headers=self.headers, name='GET /projects/me')

    @task(2)
    def profil(self):
        self.client.get('/auth/me', headers=self.headers, name='GET /auth/me')

    @task(3)
    def gallery(self):
        self.client.get('/projects/gallery', headers=self.headers, name='GET /projects/gallery')

    @task(2)
    def forum(self):
        self.client.get('/forum/threads', headers=self.headers, name='GET /forum/threads')

    @task(4)
    def buat_atau_simpan(self):
        if self.project_id is None:
            with self.client.post(
                '/projects/', headers=self.headers, name='POST /projects/', catch_response=True,
                json={'title': f'loadtest {self.n}', 'workspace_json': {}},
            ) as r:
                if r.status_code == 201:
                    self.project_id = r.json()['id']
                    r.success()
                else:
                    r.failure(f'buat project status {r.status_code}')
        else:
            self.client.put(
                f'/projects/{self.project_id}', headers=self.headers, name='PUT /projects/{id}',
                json={'workspace_json': WORKSPACE, 'generated_code': CODE},
            )

    def on_stop(self):
        # bersihkan project uji agar database tidak menumpuk
        if self.project_id:
            self.client.delete(f'/projects/{self.project_id}', headers=self.headers, name='DELETE /projects/{id}')