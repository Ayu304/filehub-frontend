import { useState, useEffect, useRef } from "react";

// ⬇️ Ganti ini dengan URL backend Railway kamu setelah deploy
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function apiFetch(path, options = {}, token) {
  return fetch(API + path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fileIcon(name) {
  const ext = (name || "").split(".").pop().toLowerCase();
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return "🖼️";
  if (["pdf"].includes(ext)) return "📄";
  if (["doc","docx"].includes(ext)) return "📝";
  if (["xls","xlsx","csv"].includes(ext)) return "📊";
  if (["zip","rar","7z"].includes(ext)) return "🗜️";
  if (["mp4","mov","avi"].includes(ext)) return "🎬";
  if (["mp3","wav"].includes(ext)) return "🎵";
  return "📁";
}

// ── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username || !password) { setError("Isi username dan password."); return; }
    setLoading(true);
    try {
      const res = await apiFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login gagal"); setLoading(false); return; }
      localStorage.setItem("fh_token", data.token);
      localStorage.setItem("fh_user", JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch {
      setError("Tidak bisa terhubung ke server.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#0a0a0f; }
        ::selection { background:#e8ff47; color:#0a0a0f; }
        .li { width:100%; background:#13131a; border:1.5px solid #2a2a38; color:#e8e8f0; padding:12px 16px; border-radius:8px; font-family:'DM Mono',monospace; font-size:14px; outline:none; transition:border-color .2s; }
        .li:focus { border-color:#e8ff47; }
        .li::placeholder { color:#444460; }
        .lb { width:100%; padding:13px; border-radius:8px; background:#e8ff47; color:#0a0a0f; font-family:'Syne',sans-serif; font-weight:700; font-size:15px; border:none; cursor:pointer; transition:opacity .2s; }
        .lb:hover { opacity:.9; }
        .lb:disabled { opacity:.5; cursor:not-allowed; }
      `}</style>
      <div style={{ width:360 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, background:"#e8ff47", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:18 }}>⬡</span>
            </div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, color:"#e8e8f0" }}>
              FILE<span style={{ color:"#e8ff47" }}>HUB</span>
            </span>
          </div>
          <p style={{ color:"#555570", fontSize:13, marginTop:10 }}>Sistem berbagi file antar komputer</p>
        </div>
        <div style={{ background:"#13131a", border:"1.5px solid #1e1e2e", borderRadius:16, padding:32 }}>
          <p style={{ color:"#888890", fontSize:12, marginBottom:20, letterSpacing:"1px" }}>MASUK KE AKUN</p>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ color:"#666680", fontSize:11, display:"block", marginBottom:6 }}>USERNAME</label>
              <input className="li" value={username} onChange={e => { setUsername(e.target.value); setError(""); }} placeholder="masukkan username" onKeyDown={e => e.key==="Enter" && handleLogin()} />
            </div>
            <div>
              <label style={{ color:"#666680", fontSize:11, display:"block", marginBottom:6 }}>PASSWORD</label>
              <input className="li" type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="masukkan password" onKeyDown={e => e.key==="Enter" && handleLogin()} />
            </div>
            {error && <p style={{ color:"#ff6b6b", fontSize:12 }}>⚠ {error}</p>}
            <button className="lb" onClick={handleLogin} disabled={loading}>{loading ? "Menghubungkan..." : "MASUK →"}</button>
          </div>
        </div>
        <p style={{ color:"#333345", fontSize:11, textAlign:"center", marginTop:20 }}>Default: admin / admin123</p>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [files, setFiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("files");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState("ALL");
  const [filterOwner, setFilterOwner] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [adminErr, setAdminErr] = useState("");
  const fileInputRef = useRef();

  useEffect(() => {
    const savedToken = localStorage.getItem("fh_token");
    const savedUser = localStorage.getItem("fh_user");
    if (savedToken && savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u); setToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (token) { fetchFiles(); if (user?.role === "admin") fetchUsers(); }
  }, [token]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleLogin(u, t) { setUser(u); setToken(t); }
  function handleLogout() {
    localStorage.removeItem("fh_token"); localStorage.removeItem("fh_user");
    setUser(null); setToken(null); setFiles([]); setUsers([]); setTab("files");
  }

  async function fetchFiles() {
    try {
      const res = await apiFetch("/api/files", {}, token || localStorage.getItem("fh_token"));
      if (res.ok) setFiles(await res.json());
    } catch { showToast("Gagal memuat file", "error"); }
  }

  async function fetchUsers() {
    try {
      const res = await apiFetch("/api/users", {}, token || localStorage.getItem("fh_token"));
      if (res.ok) setUsers(await res.json());
    } catch {}
  }

  function handleFileSelect(e) { processFile(e.target.files[0]); }
  function handleDrop(e) { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }

  async function processFile(file) {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { showToast("Maks. ukuran file 100MB", "error"); return; }

    setUploading(true); setUploadProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("target", selectedTarget);

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.floor((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false); setUploadProgress(0);
      if (xhr.status === 200) { showToast(`${file.name} berhasil diupload!`); fetchFiles(); }
      else showToast("Upload gagal", "error");
    };
    xhr.onerror = () => { setUploading(false); showToast("Upload gagal — periksa koneksi", "error"); };
    xhr.open("POST", API + "/api/upload");
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.send(formData);
  }

  async function handleDownload(f) {
    try {
      const res = await apiFetch(`/api/files/${f.id}/download`, {}, token);
      if (!res.ok) { showToast("Gagal download", "error"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = f.original_name; a.click();
      URL.revokeObjectURL(url);
      showToast(`Mengunduh ${f.original_name}`);
      fetchFiles();
    } catch { showToast("Gagal download", "error"); }
  }

  async function handleDelete(id) {
    const res = await apiFetch(`/api/files/${id}`, { method: "DELETE" }, token);
    if (res.ok) { showToast("File dihapus", "error"); fetchFiles(); }
    else showToast("Gagal menghapus", "error");
  }

  async function handleAddUser() {
    if (!newUsername || !newPassword) { setAdminErr("Isi semua field."); return; }
    const res = await apiFetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
    }, token);
    const data = await res.json();
    if (res.ok) {
      setNewUsername(""); setNewPassword(""); setAdminErr("");
      showToast("Akun berhasil dibuat!"); fetchUsers();
    } else setAdminErr(data.error || "Gagal");
  }

  async function handleDeleteUser(id) {
    const res = await apiFetch(`/api/users/${id}`, { method: "DELETE" }, token);
    if (res.ok) { showToast("Akun dihapus", "error"); fetchUsers(); }
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const visibleFiles = files.filter(f => {
    if (filterOwner !== "ALL" && f.uploader_name !== filterOwner) return false;
    if (search && !f.original_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const uploaders = [...new Set(files.map(f => f.uploader_name))];

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", fontFamily:"'DM Mono',monospace", color:"#e8e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#0a0a0f; }
        ::selection { background:#e8ff47; color:#0a0a0f; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:#13131a; }
        ::-webkit-scrollbar-thumb { background:#2a2a38; border-radius:3px; }
        .ntab { padding:8px 18px; border-radius:6px; cursor:pointer; font-size:13px; transition:all .2s; border:none; background:none; font-family:'DM Mono',monospace; }
        .ntab.active { background:#e8ff47; color:#0a0a0f; font-weight:500; }
        .ntab:not(.active) { color:#555570; }
        .ntab:not(.active):hover { color:#e8e8f0; background:#1e1e2e; }
        .abtn { padding:7px 14px; border-radius:6px; cursor:pointer; font-size:12px; font-family:'DM Mono',monospace; border:none; transition:all .15s; }
        .dl { background:#1a2a1a; color:#7dff9e; }
        .dl:hover { background:#223322; }
        .rm { background:#2a1a1a; color:#ff7d7d; }
        .rm:hover { background:#332222; }
        .frow { display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:10px; background:#13131a; border:1.5px solid #1e1e2e; transition:border-color .2s; margin-bottom:8px; }
        .frow:hover { border-color:#2a2a38; }
        .si { background:#13131a; border:1.5px solid #1e1e2e; color:#e8e8f0; padding:9px 14px; border-radius:8px; font-family:'DM Mono',monospace; font-size:13px; outline:none; width:220px; transition:border-color .2s; }
        .si:focus { border-color:#e8ff47; }
        .si::placeholder { color:#333345; }
        .dz { border:2px dashed #2a2a38; border-radius:12px; padding:36px; text-align:center; cursor:pointer; transition:all .2s; }
        .dz.over { border-color:#e8ff47; background:#13130a; }
        .dz:hover { border-color:#3a3a50; }
        .sel { background:#13131a; border:1.5px solid #1e1e2e; color:#e8e8f0; padding:9px 12px; border-radius:8px; font-family:'DM Mono',monospace; font-size:13px; outline:none; cursor:pointer; }
        .sel:focus { border-color:#e8ff47; }
        .tag { display:inline-flex; align-items:center; padding:3px 9px; border-radius:99px; font-size:11px; }
        .tag-all { background:#1a1a2e; color:#7d9dff; }
        .tag-usr { background:#1a2a1a; color:#7ddd9e; }
        .ai { background:#13131a; border:1.5px solid #2a2a38; color:#e8e8f0; padding:10px 14px; border-radius:8px; font-family:'DM Mono',monospace; font-size:13px; outline:none; width:100%; transition:border-color .2s; }
        .ai:focus { border-color:#e8ff47; }
        .ai::placeholder { color:#333345; }
        .addbtn { padding:10px 20px; background:#e8ff47; color:#0a0a0f; border:none; border-radius:8px; font-family:'Syne',sans-serif; font-weight:700; font-size:13px; cursor:pointer; transition:opacity .2s; white-space:nowrap; }
        .addbtn:hover { opacity:.85; }
        .urow { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:#13131a; border:1.5px solid #1e1e2e; border-radius:10px; margin-bottom:8px; }
        @keyframes slideIn { from { transform:translateY(-16px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>

      {toast && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:1000, padding:"12px 20px", borderRadius:10, background:toast.type==="error"?"#2a1a1a":"#1a2a1a", border:`1.5px solid ${toast.type==="error"?"#ff4444":"#44ff88"}`, color:toast.type==="error"?"#ff7d7d":"#7dff9e", fontSize:13, animation:"slideIn .2s ease" }}>
          {toast.type==="error"?"✗":"✓"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom:"1.5px solid #1e1e2e", padding:"0 32px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:28, height:28, background:"#e8ff47", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>⬡</div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18 }}>FILE<span style={{ color:"#e8ff47" }}>HUB</span></span>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            <button className={`ntab ${tab==="files"?"active":""}`} onClick={() => setTab("files")}>📁 File</button>
            {user.role==="admin" && <button className={`ntab ${tab==="admin"?"active":""}`} onClick={() => { setTab("admin"); fetchUsers(); }}>⚙ Admin</button>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:13 }}>{user.username}</div>
              <div style={{ fontSize:11, color:user.role==="admin"?"#e8ff47":"#555570" }}>{user.role}</div>
            </div>
            <button onClick={handleLogout} style={{ background:"#1e1e2e", border:"none", color:"#888890", padding:"7px 14px", borderRadius:6, cursor:"pointer", fontSize:12, fontFamily:"'DM Mono',monospace" }}>Keluar</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"32px" }}>

        {/* FILES TAB */}
        {tab==="files" && (
          <div>
            <div style={{ marginBottom:28 }}>
              <p style={{ color:"#555570", fontSize:11, marginBottom:12, letterSpacing:"1px" }}>UPLOAD FILE BARU</p>
              <div style={{ marginBottom:12 }}>
                <label style={{ color:"#444460", fontSize:11, display:"block", marginBottom:6 }}>KIRIM KE</label>
                <select className="sel" value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)} style={{ width:"100%", maxWidth:300 }}>
                  <option value="ALL">Semua pengguna</option>
                  {users.filter(u => u.id !== user.id).map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              </div>
              <div className={`dz ${dragOver?"over":""}`} onClick={() => fileInputRef.current.click()} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
                <input ref={fileInputRef} type="file" style={{ display:"none" }} onChange={handleFileSelect} />
                {uploading ? (
                  <div>
                    <div style={{ color:"#e8ff47", fontSize:13, marginBottom:12, animation:"pulse 1s infinite" }}>⬆ Mengupload... {uploadProgress}%</div>
                    <div style={{ background:"#1e1e2e", borderRadius:99, height:4, overflow:"hidden" }}>
                      <div style={{ width:uploadProgress+"%", height:"100%", background:"#e8ff47", transition:"width .1s", borderRadius:99 }} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:28, marginBottom:10 }}>📤</div>
                    <p style={{ color:"#555570", fontSize:13 }}>Klik atau drag file ke sini</p>
                    <p style={{ color:"#333345", fontSize:11, marginTop:6 }}>Maks. 100MB per file</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <p style={{ color:"#555570", fontSize:11, letterSpacing:"1px" }}>DAFTAR FILE <span style={{ color:"#333345" }}>({visibleFiles.length})</span></p>
                <div style={{ display:"flex", gap:8 }}>
                  {user.role==="admin" && (
                    <select className="sel" value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={{ fontSize:12 }}>
                      <option value="ALL">Semua pengirim</option>
                      {uploaders.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  )}
                  <input className="si" placeholder="Cari file..." value={search} onChange={e => setSearch(e.target.value)} />
                  <button onClick={fetchFiles} style={{ background:"#1e1e2e", border:"none", color:"#888890", padding:"9px 14px", borderRadius:8, cursor:"pointer", fontSize:12, fontFamily:"'DM Mono',monospace" }}>↻ Refresh</button>
                </div>
              </div>

              {visibleFiles.length===0 ? (
                <div style={{ textAlign:"center", padding:"60px 0", color:"#333345" }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>📭</div>
                  <p style={{ fontSize:13 }}>Belum ada file</p>
                </div>
              ) : visibleFiles.map(f => (
                <div key={f.id} className="frow">
                  <span style={{ fontSize:24 }}>{fileIcon(f.original_name)}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, color:"#e8e8f0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{f.original_name}</div>
                    <div style={{ fontSize:11, color:"#444460", marginTop:3, display:"flex", gap:12 }}>
                      <span>{formatSize(f.size)}</span>
                      <span>dari {f.uploader_name}</span>
                      <span>{formatDate(f.uploaded_at)}</span>
                      <span>↓ {f.downloads}x</span>
                    </div>
                  </div>
                  <span className={`tag ${f.target==="ALL"?"tag-all":"tag-usr"}`}>
                    {f.target==="ALL" ? "Semua" : users.find(u => u.id===f.target)?.username || "Spesifik"}
                  </span>
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="abtn dl" onClick={() => handleDownload(f)}>↓ Unduh</button>
                    {(user.role==="admin" || f.uploader_id===user.id) && (
                      <button className="abtn rm" onClick={() => handleDelete(f.id)}>✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADMIN TAB */}
        {tab==="admin" && user.role==="admin" && (
          <div>
            <p style={{ color:"#555570", fontSize:11, marginBottom:20, letterSpacing:"1px" }}>MANAJEMEN AKUN</p>
            <div style={{ background:"#13131a", border:"1.5px solid #1e1e2e", borderRadius:12, padding:24, marginBottom:28 }}>
              <p style={{ color:"#888890", fontSize:12, marginBottom:16 }}>Tambah Akun Baru</p>
              <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ color:"#444460", fontSize:11, display:"block", marginBottom:6 }}>USERNAME</label>
                  <input className="ai" placeholder="username" value={newUsername} onChange={e => { setNewUsername(e.target.value); setAdminErr(""); }} />
                </div>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ color:"#444460", fontSize:11, display:"block", marginBottom:6 }}>PASSWORD</label>
                  <input className="ai" placeholder="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setAdminErr(""); }} />
                </div>
                <div>
                  <label style={{ color:"#444460", fontSize:11, display:"block", marginBottom:6 }}>ROLE</label>
                  <select className="sel" value={newRole} onChange={e => setNewRole(e.target.value)}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <button className="addbtn" onClick={handleAddUser}>+ Tambah</button>
              </div>
              {adminErr && <p style={{ color:"#ff6b6b", fontSize:12, marginTop:10 }}>⚠ {adminErr}</p>}
            </div>

            <p style={{ color:"#555570", fontSize:11, marginBottom:14, letterSpacing:"1px" }}>DAFTAR AKUN ({users.length})</p>
            {users.map(u => (
              <div key={u.id} className="urow">
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:34, height:34, borderRadius:8, background:u.role==="admin"?"#1a1a0a":"#0a1a1a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                    {u.role==="admin"?"👑":"🖥️"}
                  </div>
                  <div>
                    <div style={{ fontSize:14 }}>{u.username}</div>
                    <div style={{ fontSize:11, color:"#444460" }}>{u.role} · {formatDate(u.created_at)}</div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span className="tag" style={{ background:u.role==="admin"?"#1a1a0a":"#0a1a1a", color:u.role==="admin"?"#e8ff47":"#7ddd9e" }}>{u.role}</span>
                  {u.id !== user.id
                    ? <button className="abtn rm" onClick={() => handleDeleteUser(u.id)}>✕ Hapus</button>
                    : <span style={{ fontSize:11, color:"#333345" }}>akun ini</span>}
                </div>
              </div>
            ))}

            <div style={{ marginTop:28, padding:"16px 20px", background:"#13131a", border:"1.5px solid #1e1e2e", borderRadius:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#555570", flexWrap:"wrap", gap:8 }}>
                <span>File: <span style={{ color:"#e8e8f0" }}>{files.length}</span></span>
                <span>Total ukuran: <span style={{ color:"#e8e8f0" }}>{formatSize(files.reduce((a,f) => a+f.size, 0))}</span></span>
                <span>Total download: <span style={{ color:"#e8e8f0" }}>{files.reduce((a,f) => a+(f.downloads||0), 0)}x</span></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
