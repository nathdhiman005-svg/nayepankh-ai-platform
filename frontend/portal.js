// Auto-detect environment: use localhost for local development, and relative path for Vercel (which proxies to backend)
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE_URL = isLocal ? "http://localhost:8000" : "";
let currentUser = null;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

function checkAuth() {
    const token = sessionStorage.getItem('np_token');
    if (token) {
        fetchMe(token);
    } else {
        showView('auth-view');
    }
}

function showView(viewId) {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById(viewId).classList.remove('hidden');
}

// ==========================================
// AUTHENTICATION
// ==========================================
// Auth tabs removed per requirement

function fillDemoCredentials() {
    const val = document.getElementById('demo-login-select').value;
    const u = document.getElementById('login-username');
    const p = document.getElementById('login-password');
    if (val === 'head') { u.value = 'head_admin'; p.value = 'admin123'; }
    else if (val === 'manager') { u.value = 'manager_dummy'; p.value = 'manager123'; }
    else if (val === 'staff') { u.value = 'staff_dummy'; p.value = 'staff123'; }
    else { u.value = ''; p.value = ''; }
}

async function login() {
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    err.textContent = "";

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        
        if (!response.ok) throw new Error("Invalid credentials");
        
        const data = await response.json();
        sessionStorage.setItem('np_token', data.access_token);
        currentUser = data;
        buildDashboard();
    } catch (e) {
        err.textContent = e.message;
    }
}

// Signup logic moved to dashboard

function logout() {
    sessionStorage.removeItem('np_token');
    currentUser = null;
    showView('auth-view');
}

async function fetchMe(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Session expired");
        currentUser = await response.json();
        // Since /me doesn't return the token, grab it from localStorage
        currentUser.access_token = token; 
        buildDashboard();
    } catch (e) {
        logout();
    }
}

// ==========================================
// DASHBOARD BUILDER
// ==========================================
function buildDashboard() {
    showView('dashboard-view');
    document.getElementById('user-greeting').textContent = `Hello, ${currentUser.full_name}`;
    document.getElementById('user-role-badge').textContent = currentUser.role;

    const sidebar = document.getElementById('sidebar');
    let linksHTML = '';

    if (currentUser.role === 'staff') {
        linksHTML = `
            <a class="sidebar-link active" onclick="loadStaffDashboard()">My Dashboard</a>
            <a class="sidebar-link" onclick="loadMessagesTab()">Messages</a>
        `;
        loadStaffDashboard();
    } 
    else if (currentUser.role === 'manager') {
        linksHTML = `
            <a class="sidebar-link active" onclick="loadManagerStaff()">Manage Staff</a>
            <a class="sidebar-link" onclick="loadManagerEvents()">Manage Events</a>
            <a class="sidebar-link" onclick="loadManagerVolunteers()">Volunteer Applications</a>
            <a class="sidebar-link" onclick="loadCampaignAI()">AI Campaign Generator</a>
            <a class="sidebar-link" onclick="loadManagerQueries()">User Queries</a>
            <a class="sidebar-link" onclick="loadMessagesTab()">Messages</a>
        `;
        loadManagerStaff();
    }
    else if (currentUser.role === 'head') {
        linksHTML = `
            <a class="sidebar-link active" onclick="loadHeadDashboard()">Overview Dashboard</a>
            <a class="sidebar-link" onclick="loadManagerStaff()">All Staff Details</a>
            <a class="sidebar-link" onclick="loadHeadRemovalRequests()">Staff Removal Requests</a>
            <a class="sidebar-link" onclick="loadHeadVolunteers()">Accepted Volunteers</a>
            <a class="sidebar-link" onclick="loadCampaignAI()">AI Campaign Generator</a>
            <a class="sidebar-link" onclick="loadManagerQueries()">User Queries</a>
            <a class="sidebar-link" onclick="loadMessagesTab()">Messages</a>
        `;
        loadHeadDashboard();
    }

    sidebar.innerHTML = linksHTML;
}

function updateActiveTab(index) {
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(l => l.classList.remove('active'));
    if(links[index]) links[index].classList.add('active');
}

// ==========================================
// STAFF VIEWS
// ==========================================
async function loadStaffDashboard() {
    updateActiveTab(0);
    const main = document.getElementById('main-content');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/staff/dashboard`, {
            headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
        });
        const data = await response.json();
        
        let historyRows = data.history.map(h => `
            <tr>
                <td>${h.title}</td>
                <td>${h.event_date}</td>
                <td><span class="badge" style="background:#10b981; color:white;">${h.status}</span></td>
            </tr>
        `).join('');

        main.innerHTML = `
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-value">${data.events_joined}</div>
                    <div class="stat-label">Events Attended</div>
                </div>
                <div class="stat-card" style="background:var(--primary-600); color:white;">
                    <div class="stat-value">Great Job!</div>
                    <div class="stat-label" style="color:var(--primary-100)">Keep up the good work</div>
                </div>
            </div>
            <div class="data-panel">
                <h3>My Event History</h3>
                <table>
                    <tr><th>Event Title</th><th>Date</th><th>Status</th></tr>
                    ${historyRows || '<tr><td colspan="3">No events joined yet.</td></tr>'}
                </table>
            </div>
        `;
    } catch(e) {
        main.innerHTML = `<p class="error-msg">Failed to load dashboard.</p>`;
    }
}

// ==========================================
// HEAD VIEWS
// ==========================================
async function loadHeadDashboard() {
    updateActiveTab(0);
    const main = document.getElementById('main-content');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/head/dashboard`, {
            headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
        });
        const data = await response.json();
        const s = data.stats;
        
        main.innerHTML = `
            <div class="stat-grid">
                <div class="stat-card"><div class="stat-value">${s.staff_count}</div><div class="stat-label">Total Staff</div></div>
                <div class="stat-card"><div class="stat-value">${s.manager_count}</div><div class="stat-label">Managers</div></div>
                <div class="stat-card"><div class="stat-value">${s.event_count}</div><div class="stat-label">Total Events</div></div>
                <div class="stat-card"><div class="stat-value">${s.volunteer_count}</div><div class="stat-label">Public Volunteers</div></div>
            </div>
            
            <div class="data-panel">
                <h3>Management Team</h3>
                <table>
                    <tr><th>Name</th><th>Username</th><th>Joined</th></tr>
                    ${data.managers.map(m => `<tr><td>${m.full_name}</td><td>${m.username}</td><td>${new Date(m.created_at).toLocaleDateString()}</td></tr>`).join('')}
                </table>
            </div>
        `;
    } catch(e) {
        main.innerHTML = `<p class="error-msg">Failed to load dashboard.</p>`;
    }
}

// ==========================================
// MANAGER VIEWS
// ==========================================
async function loadManagerStaff() {
    updateActiveTab(currentUser.role === 'head' ? 1 : 0);
    const main = document.getElementById('main-content');
    main.innerHTML = `<h3>Loading staff...</h3>`;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/manager/staff`, {
            headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
        });
        const staffList = await response.json();
        
        let rows = staffList.map(s => `
            <tr>
                <td><strong>#${s.id}</strong></td>
                <td>${s.full_name}</td>
                <td>${s.username}</td>
                <td>${new Date(s.created_at).toLocaleDateString()}</td>
                <td>
                    ${currentUser.role === 'head' ? 
                        `<button onclick="removeStaff(${s.id})" class="btn outline-btn small" style="color:red; border-color:red;">Remove</button>` : 
                        `<button onclick="requestRemoveStaff(${s.id})" class="btn outline-btn small" style="color:#d97706; border-color:#d97706;">Remove Request</button>`
                    }
                </td>
            </tr>
        `).join('');

        main.innerHTML = `
            <div class="data-panel">
                <div class="flex-between">
                    <h3>Staff Directory</h3>
                    <button class="btn primary-btn small" onclick="document.getElementById('create-staff-form').classList.toggle('hidden')">+ Add Staff</button>
                </div>
                <div id="create-staff-form" class="hidden" style="margin: 1.5rem 0; padding: 1.5rem; background: white; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; max-width: 500px;">
                    <h4 style="margin-top:0; margin-bottom:1rem; color:var(--primary-700); font-size: 1.1rem;">Add New Staff Member</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.5rem; color:#374151;">Full Name</label>
                            <input type="text" id="new-staff-name" placeholder="E.g. John Doe" class="auth-form" style="display:block; width:100%;">
                        </div>
                        <div>
                            <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.5rem; color:#374151;">Username</label>
                            <input type="text" id="new-staff-user" placeholder="No spaces (e.g. john_doe)" class="auth-form" style="display:block; width:100%;" title="Only letters, numbers, and underscores allowed">
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.5rem; color:#374151;">Password</label>
                        <div style="position: relative;">
                            <input type="password" id="new-staff-pass" oninput="checkPasswordRequirements(this.value)" placeholder="Enter a secure password" class="auth-form" style="display:block; width:100%; padding-right: 3rem;">
                            <button type="button" onclick="togglePasswordIcon('new-staff-pass', this)" style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #6b7280; padding: 0.25rem; display: flex; align-items: center; justify-content: center;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                        </div>
                        
                        <div id="password-requirements" style="margin-top: 0.75rem; font-size: 0.8rem; color: #ef4444; display:flex; flex-direction:column; gap:0.25rem;">
                            <div id="req-len" style="display:flex; align-items:center; gap:0.5rem;"><span>❌</span> At least 8 characters</div>
                            <div id="req-up" style="display:flex; align-items:center; gap:0.5rem;"><span>❌</span> One uppercase letter</div>
                            <div id="req-num" style="display:flex; align-items:center; gap:0.5rem;"><span>❌</span> One number</div>
                        </div>
                    </div>

                    ${currentUser.role === 'head' ? `
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.5rem; color:#374151;">Role</label>
                        <select id="new-staff-role" class="auth-form" style="display:block; width:100%;">
                            <option value="staff">Staff</option>
                            <option value="manager">Manager</option>
                        </select>
                    </div>
                    ` : ''}
                    
                    <div style="display: flex; justify-content: flex-end; gap: 1rem;">
                        <button type="button" class="btn outline-btn" onclick="document.getElementById('create-staff-form').classList.add('hidden')">Cancel</button>
                        <button type="button" class="btn primary-btn" onclick="createStaff()">Create Account</button>
                    </div>
                </div>
                <br>
                <table>
                    <tr><th>ID</th><th>Name</th><th>Username</th><th>Joined</th><th>Action</th></tr>
                    ${rows || '<tr><td colspan="5">No staff found.</td></tr>'}
                </table>
            </div>
        `;
    } catch(e) {
        main.innerHTML = `<p class="error-msg">Failed to load staff.</p>`;
    }
}

async function createStaff() {
    const fn = document.getElementById('new-staff-name').value;
    const user = document.getElementById('new-staff-user').value;
    const pass = document.getElementById('new-staff-pass').value;
    const roleEl = document.getElementById('new-staff-role');
    const role = roleEl ? roleEl.value : 'staff';
    
    if(!user || !pass || !fn) return alert("Staff Name, Username and Password are required. Please make sure all fields are filled.");

    const userPattern = /^[a-zA-Z0-9_]+$/;
    if (!userPattern.test(user)) {
        return alert("Username must contain only letters, numbers, and underscores (no spaces).");
    }

    const passPattern = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passPattern.test(pass)) {
        return alert("Password must be at least 8 characters long, include an uppercase letter and a number.");
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.access_token}` },
            body: JSON.stringify({ username: user, password: pass, full_name: fn, role: role })
        });
        
        if (!response.ok) throw new Error("Username taken or invalid");
        loadManagerStaff();
    } catch (e) {
        alert(e.message);
    }
}

async function removeStaff(id) {
    if(!confirm("Are you sure you want to remove this staff member?")) return;
    await fetch(`${API_BASE_URL}/api/head/staff/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
    });
    loadManagerStaff();
}

async function requestRemoveStaff(id) {
    if(!confirm("Are you sure you want to send a removal request to the Head Administrator?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/manager/staff/${id}/remove-request`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
        });
        if(!response.ok) {
            const err = await response.json();
            throw new Error(err.detail);
        }
        alert("Removal request sent!");
        loadManagerStaff();
    } catch(e) {
        alert(e.message);
    }
}

async function loadManagerEvents() {
    updateActiveTab(1);
    const main = document.getElementById('main-content');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/manager/events`, {
            headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
        });
        const events = await response.json();
        
        let rows = events.map(e => `
            <tr>
                <td><strong>${e.title}</strong><br><small>${e.description}</small></td>
                <td>${e.event_date}</td>
                <td>${e.manager_name}</td>
                <td><button onclick="markAttendancePrompt(${e.id})" class="btn outline-btn small">Mark Attendance</button></td>
            </tr>
        `).join('');

        main.innerHTML = `
            <div class="data-panel">
                <div class="flex-between">
                    <h3>Events</h3>
                    <button class="btn primary-btn small" onclick="showCreateEvent()">+ New Event</button>
                </div>
                <div id="create-event-form" style="display:none; margin: 1rem 0; padding: 1rem; background:#f9fafb; border-radius:0.5rem; gap:1rem; align-items:center;">
                    <input type="text" id="ev-title" placeholder="Event Title" class="auth-form" style="display:block;">
                    <input type="date" id="ev-date" class="auth-form" style="display:block;">
                    <input type="text" id="ev-desc" placeholder="Short Description" class="auth-form" style="display:block; flex:1;">
                    <button class="btn primary-btn" onclick="saveNewEvent()">Save</button>
                </div>
                <br>
                <table>
                    <tr><th>Event</th><th>Date</th><th>Created By</th><th>Action</th></tr>
                    ${rows || '<tr><td colspan="4">No events found.</td></tr>'}
                </table>
            </div>
        `;
    } catch(e) {}
}

function showCreateEvent() {
    const el = document.getElementById('create-event-form');
    if (el.style.display === 'none') {
        el.style.display = 'flex';
    } else {
        el.style.display = 'none';
    }
}

async function saveNewEvent() {
    const title = document.getElementById('ev-title').value;
    const date = document.getElementById('ev-date').value;
    const desc = document.getElementById('ev-desc').value;
    if(!title || !date) return alert("Title and date required");
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/manager/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.access_token}` },
            body: JSON.stringify({ title, event_date: date, description: desc })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Failed to save event");
        }
        
        // Reset form fields and hide
        document.getElementById('ev-title').value = '';
        document.getElementById('ev-date').value = '';
        document.getElementById('ev-desc').value = '';
        showCreateEvent();
        
        loadManagerEvents();
    } catch(e) {
        alert(e.message);
    }
}

async function markAttendancePrompt(eventId) {
    const staffId = prompt("Enter Staff ID to mark as attended (Check the 'Manage Staff' tab for IDs):");
    if(!staffId) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/manager/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.access_token}` },
            body: JSON.stringify({ event_id: eventId, staff_id: parseInt(staffId) })
        });
        if(!res.ok) throw new Error("Staff ID not found or already marked");
        alert("Attendance recorded!");
    } catch(e) {
        alert(e.message);
    }
}

async function loadManagerVolunteers() {
    updateActiveTab(2);
    const main = document.getElementById('main-content');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/manager/volunteers`, {
            headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
        });
        const vols = await response.json();
        
        let rows = vols.map(v => `
            <tr>
                <td>${v.name}<br><small>${v.email} | ${v.phone}</small></td>
                <td>${v.role}</td>
                <td><small>${new Date(v.timestamp).toLocaleString()}</small></td>
                <td>
                    <button onclick="updateVolunteerStatus(${v.id}, 'accepted')" class="btn primary-btn small" style="margin-right:0.5rem; background:#10b981;">Accept</button>
                    <button onclick="updateVolunteerStatus(${v.id}, 'declined')" class="btn outline-btn small" style="color:red; border-color:red;">Decline</button>
                </td>
            </tr>
        `).join('');

        main.innerHTML = `
            <div class="data-panel">
                <h3>Pending Volunteer Applications</h3>
                <table>
                    <tr><th>Applicant Details</th><th>Preferred Role</th><th>Applied On</th><th>Action</th></tr>
                    ${rows || '<tr><td colspan="4">No pending applications found.</td></tr>'}
                </table>
            </div>
        `;
    } catch(e) {}
}

async function updateVolunteerStatus(id, status) {
    if(!confirm(`Are you sure you want to ${status} this application?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/manager/volunteers/${id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.access_token}` },
            body: JSON.stringify({ status })
        });
        if(!res.ok) throw new Error("Failed to update status");
        loadManagerVolunteers();
    } catch(e) {
        alert(e.message);
    }
}

async function loadManagerQueries() {
    updateActiveTab(currentUser.role === 'head' ? 5 : 4);
    const main = document.getElementById('main-content');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/manager/queries`, {
            headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
        });
        const queries = await response.json();
        
        let rows = queries.map(q => {
            const subject = encodeURIComponent(`Re: ${q.subject || 'Your Query to NayePankh Foundation'}`);
            const body = encodeURIComponent(`\n\n\n--- Original Message ---\n${q.message}`);
            return `
            <tr>
                <td><strong>${q.name}</strong><br><small><a href="mailto:${q.email}">${q.email}</a></small></td>
                <td><strong>${q.subject || 'No Subject'}</strong><br><small>${q.message}</small></td>
                <td><small>${new Date(q.timestamp).toLocaleString()}</small></td>
                <td>
                    <a href="https://mail.google.com/mail/?view=cm&fs=1&to=${q.email}&su=${subject}&body=${body}" target="_blank" class="btn primary-btn small" style="text-decoration:none;">Reply</a>
                </td>
            </tr>
            `;
        }).join('');

        main.innerHTML = `
            <div class="data-panel">
                <h3>User Queries (Contact Us)</h3>
                <table>
                    <tr><th>User Details</th><th>Message</th><th>Date Received</th><th>Action</th></tr>
                    ${rows || '<tr><td colspan="4">No user queries found.</td></tr>'}
                </table>
            </div>
        `;
    } catch(e) {
        main.innerHTML = `<p class="error-msg">Failed to load user queries.</p>`;
    }
}

async function loadHeadRemovalRequests() {
    updateActiveTab(2);
    const main = document.getElementById('main-content');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/head/remove-requests`, {
            headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
        });
        const requests = await response.json();
        
        let rows = requests.map(r => `
            <tr>
                <td>${r.staff_name} (${r.staff_username})</td>
                <td>${r.manager_name}</td>
                <td><small>${new Date(r.timestamp).toLocaleString()}</small></td>
                <td>
                    <button onclick="resolveRemoveRequest(${r.id}, 'approved', ${r.staff_id})" class="btn primary-btn small" style="margin-right:0.5rem; background:#10b981;">Approve</button>
                    <button onclick="resolveRemoveRequest(${r.id}, 'rejected', ${r.staff_id})" class="btn outline-btn small" style="color:red; border-color:red;">Reject</button>
                </td>
            </tr>
        `).join('');

        main.innerHTML = `
            <div class="data-panel">
                <h3>Pending Staff Removal Requests</h3>
                <table>
                    <tr><th>Staff Member</th><th>Requested By</th><th>Requested On</th><th>Action</th></tr>
                    ${rows || '<tr><td colspan="4">No pending removal requests.</td></tr>'}
                </table>
            </div>
        `;
    } catch(e) {}
}

async function resolveRemoveRequest(requestId, status, staffId) {
    if(!confirm(`Are you sure you want to ${status} this request?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/head/remove-requests/${requestId}/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.access_token}` },
            body: JSON.stringify({ status, staff_id: staffId })
        });
        if(!res.ok) throw new Error("Failed to resolve request");
        loadHeadRemovalRequests();
    } catch(e) {
        alert(e.message);
    }
}

async function loadHeadVolunteers() {
    updateActiveTab(3);
    const main = document.getElementById('main-content');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/head/volunteers`, {
            headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
        });
        const vols = await response.json();
        
        let rows = vols.map(v => `
            <tr>
                <td>${v.name}<br><small>${v.email} | ${v.phone}</small></td>
                <td>${v.role}</td>
                <td><span class="badge" style="background:#10b981; color:white; padding: 0.2rem 0.5rem; border-radius: 0.25rem;">Accepted</span></td>
                <td><small>${new Date(v.timestamp).toLocaleString()}</small></td>
            </tr>
        `).join('');

        main.innerHTML = `
            <div class="data-panel">
                <h3>Accepted Volunteers</h3>
                <table>
                    <tr><th>Volunteer Details</th><th>Role</th><th>Status</th><th>Applied On</th></tr>
                    ${rows || '<tr><td colspan="4">No accepted volunteers found.</td></tr>'}
                </table>
            </div>
        `;
    } catch(e) {}
}

// ==========================================
// CAMPAIGN GENERATOR (Managers & Head)
// ==========================================
function loadCampaignAI() {
    updateActiveTab(currentUser.role === 'head' ? 2 : 3);
    const main = document.getElementById('main-content');
    
    main.innerHTML = `
        <div class="data-panel">
            <h3>✨ AI Campaign Content Generator</h3>
            <p style="color:#6b7280; margin-bottom:1.5rem;">Generate high-converting social media posts and awareness campaigns.</p>
            
            <div style="display:flex; gap:1rem; margin-bottom:1.5rem;">
                <input type="text" id="campaign-topic" placeholder="e.g., Winter Clothes Donation Drive" style="flex:1; padding:0.75rem; border:1px solid #d1d5db; border-radius:0.5rem; font-family:inherit;">
                <button class="btn primary-btn" onclick="generateCampaign()" id="generate-btn">Generate Content</button>
            </div>
            
            <div id="campaign-results" style="background:#f9fafb; padding:1.5rem; border-radius:0.5rem; display:none;"></div>
        </div>
    `;
}

async function generateCampaign() {
    const topic = document.getElementById('campaign-topic').value;
    const btn = document.getElementById('generate-btn');
    const results = document.getElementById('campaign-results');
    if(!topic) return;
    
    btn.disabled = true;
    btn.textContent = "Generating...";
    results.style.display = 'block';
    results.innerHTML = "Thinking... Please wait.";
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/generate-content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.access_token}` },
            body: JSON.stringify({ campaign_topic: topic })
        });
        
        if (!response.ok) throw new Error("Failed to generate");
        const data = await response.json();
        
        // Basic markdown parser
        let formatted = data.content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
            
        results.innerHTML = formatted;
    } catch(e) {
        results.innerHTML = `<span class="error-msg">Error: ${e.message}</span>`;
    } finally {
        btn.disabled = false;
        btn.textContent = "Generate Content";
    }
}

// ==========================================
// UTILS
// ==========================================
function togglePassword(inputId, iconSpan) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        iconSpan.textContent = 'HIDE';
    } else {
        input.type = 'password';
        iconSpan.textContent = 'SHOW';
    }
}

function togglePasswordCheckbox(inputId, checkbox) {
    const input = document.getElementById(inputId);
    if (checkbox.checked) {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

function togglePasswordIcon(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
        btn.style.color = 'var(--primary-600)';
    } else {
        input.type = 'password';
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        btn.style.color = '#6b7280';
    }
}

function checkPasswordRequirements(val) {
    const lenReq = document.getElementById('req-len');
    const upReq = document.getElementById('req-up');
    const numReq = document.getElementById('req-num');
    
    if(!lenReq) return;
    
    const hasLen = val.length >= 8;
    const hasUp = /[A-Z]/.test(val);
    const hasNum = /\d/.test(val);
    
    const updateReq = (el, met, text) => {
        el.innerHTML = met ? `<span>✅</span> ${text}` : `<span>❌</span> ${text}`;
        el.style.color = met ? '#10b981' : '#ef4444';
    };
    
    updateReq(lenReq, hasLen, 'At least 8 characters');
    updateReq(upReq, hasUp, 'One uppercase letter');
    updateReq(numReq, hasNum, 'One number');
}

// ==========================================
// INTERNAL MESSAGING
// ==========================================
let currentConversationId = null;
let messagingInterval = null;

async function loadMessagesTab() {
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(l => l.classList.remove('active'));
    // Activate the Messages link (the last one usually, but we don't know index perfectly here. We can just find it)
    links.forEach(l => {
        if(l.textContent === 'Messages') l.classList.add('active');
    });

    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="messaging-container" style="display:flex; height: 80vh; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden; background: white;">
            <!-- Left Pane: Conversations List -->
            <div class="chat-sidebar" style="width: 300px; border-right: 1px solid #e5e7eb; display:flex; flex-direction:column; background: #f9fafb;">
                <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb;">
                    <h3 style="margin: 0; color: var(--primary-700);">Messages</h3>
                    <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                        <input type="text" id="chat-search-input" placeholder="Search user to chat..." class="auth-form" style="display:block; margin:0; flex:1; padding: 0.4rem;">
                        <button onclick="searchUsersForChat()" class="btn primary-btn small">🔍</button>
                    </div>
                </div>
                <div id="conversations-list" style="flex:1; overflow-y: auto;">
                    <div style="padding: 1rem; color: #6b7280; font-size: 0.9rem; text-align: center;">Loading conversations...</div>
                </div>
            </div>

            <!-- Right Pane: Chat Window -->
            <div class="chat-window" style="flex: 1; display: flex; flex-direction: column; background: white;">
                <div id="chat-header" style="padding: 1rem; border-bottom: 1px solid #e5e7eb; background: #f9fafb; display: flex; align-items: center;">
                    <h4 style="margin: 0; color: #374151;">Select a conversation</h4>
                </div>
                
                <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; background: #fafafa;">
                    <div style="text-align: center; color: #9ca3af; margin-top: 2rem;">No conversation selected.</div>
                </div>

                <div id="chat-input-area" style="padding: 1rem; border-top: 1px solid #e5e7eb; display: none; gap: 0.5rem; background: #f9fafb;">
                    <input type="text" id="chat-message-input" placeholder="Type your message..." class="auth-form" style="display:block; margin:0; flex:1;" onkeypress="if(event.key === 'Enter') sendMessage()">
                    <button onclick="sendMessage()" class="btn primary-btn">Send</button>
                </div>
            </div>
        </div>
    `;

    currentConversationId = null;
    if (messagingInterval) clearInterval(messagingInterval);
    await loadConversationsList();
    
    // Auto refresh conversations and active chat every 5 seconds
    messagingInterval = setInterval(async () => {
        await loadConversationsList(true); // silent load
        if (currentConversationId) {
            await openConversation(currentConversationId, document.getElementById('chat-header').dataset.title, true);
        }
    }, 5000);
}

async function loadConversationsList(silent = false) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/messaging/conversations`, {
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('np_token')}` },
            cache: 'no-store'
        });
        const convs = await response.json();
        
        const listEl = document.getElementById('conversations-list');
        if (!listEl) return; // Switched tab

        if (convs.length === 0) {
            listEl.innerHTML = `<div style="padding: 1rem; color: #6b7280; font-size: 0.9rem; text-align: center;">No conversations yet. Search above to start one!</div>`;
            return;
        }

        let html = '';
        convs.forEach(c => {
            const isUnread = c.unread_count > 0;
            const timeStr = c.last_message_time ? new Date(c.last_message_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
            const unreadBadge = isUnread ? `<span style="background: var(--primary-600); color: white; border-radius: 50%; padding: 0.1rem 0.4rem; font-size: 0.75rem; font-weight: bold;">${c.unread_count}</span>` : '';
            const bg = currentConversationId === c.id ? '#f3f4f6' : 'white';
            
            html += `
                <div class="conv-item" onclick="openConversation(${c.id}, '${c.other_full_name} (${c.other_role})')" style="padding: 1rem; border-bottom: 1px solid #e5e7eb; cursor: pointer; display: flex; align-items: center; justify-content: space-between; background: ${bg}; transition: background 0.2s;">
                    <div style="flex:1; overflow:hidden;">
                        <div style="font-weight: ${isUnread ? '700' : '500'}; color: #111827;">${c.other_full_name}</div>
                        <div style="font-size: 0.8rem; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: ${isUnread ? '600' : '400'};">
                            ${c.last_message || 'No messages yet'}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; margin-left: 0.5rem;">
                        <span style="font-size: 0.7rem; color: #9ca3af;">${timeStr}</span>
                        ${unreadBadge}
                    </div>
                </div>
            `;
        });
        listEl.innerHTML = html;
    } catch (e) {
        if(!silent) console.error("Failed to load conversations", e);
    }
}

async function searchUsersForChat() {
    const q = document.getElementById('chat-search-input').value.trim();
    if (!q) {
        loadConversationsList();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/messaging/users/search?q=${encodeURIComponent(q)}`, {
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('np_token')}` },
            cache: 'no-store'
        });
        const users = await response.json();
        
        const listEl = document.getElementById('conversations-list');
        if (users.length === 0) {
            listEl.innerHTML = `<div style="padding: 1rem; color: #6b7280; font-size: 0.9rem; text-align: center;">No users found you are permitted to message.</div>`;
            return;
        }

        let html = '<div style="padding: 0.5rem 1rem; background: #f3f4f6; font-size: 0.8rem; font-weight: bold; color: #6b7280;">Search Results</div>';
        users.forEach(u => {
            html += `
                <div class="conv-item" onclick="startNewConversation(${u.id}, '${u.full_name} (${u.role})')" style="padding: 1rem; border-bottom: 1px solid #e5e7eb; cursor: pointer; display: flex; align-items: center; justify-content: space-between; background: white;">
                    <div style="font-weight: 500; color: #111827;">${u.full_name} <span style="font-size: 0.75rem; color: #9ca3af; font-weight: normal;">@${u.username}</span></div>
                    <span style="font-size: 0.75rem; background: #e5e7eb; padding: 0.1rem 0.4rem; border-radius: 0.25rem;">${u.role}</span>
                </div>
            `;
        });
        listEl.innerHTML = html;
    } catch (e) {
        alert("Search failed.");
    }
}

async function startNewConversation(userId, title) {
    // Send a blank message to initialize conversation, or just set UI to allow sending first message
    try {
        const response = await fetch(`${API_BASE_URL}/api/messaging/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('np_token')}` },
            body: JSON.stringify({ receiver_id: userId, content: "Hello!" }) // Seed message
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Cannot start conversation");
        }
        const data = await response.json();
        
        // Reload lists and open the new conversation
        document.getElementById('chat-search-input').value = '';
        await loadConversationsList();
        openConversation(data.conversation_id, title);
    } catch (e) {
        alert(e.message);
    }
}

async function openConversation(convId, title, silent = false) {
    currentConversationId = convId;
    
    if(!silent) {
        const header = document.getElementById('chat-header');
        header.innerHTML = `<h4 style="margin: 0; color: #374151;">${title}</h4>`;
        header.dataset.title = title;
        document.getElementById('chat-input-area').style.display = 'flex';
        document.getElementById('chat-messages').innerHTML = `<div style="text-align: center; color: #9ca3af; margin-top: 2rem;">Loading messages...</div>`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/messaging/conversations/${convId}/messages`, {
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('np_token')}` },
            cache: 'no-store'
        });
        const messages = await response.json();
        
        const msgsEl = document.getElementById('chat-messages');
        if (!msgsEl) return;

        let html = '';
        let lastDate = null;

        messages.forEach(m => {
            const dateObj = new Date(m.timestamp);
            const dateStr = dateObj.toLocaleDateString();
            const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            if (dateStr !== lastDate) {
                html += `<div style="text-align: center; margin: 1rem 0;"><span style="background: #e5e7eb; color: #4b5563; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.75rem;">${dateStr}</span></div>`;
                lastDate = dateStr;
            }

            const isMine = m.sender_username === currentUser.username;
            const bubbleBg = isMine ? 'var(--primary-600)' : 'white';
            const textColor = isMine ? 'white' : '#111827';
            const align = isMine ? 'flex-end' : 'flex-start';
            const borderR = isMine ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0';
            const shadow = isMine ? 'none' : '0 1px 2px rgba(0,0,0,0.05)';
            const border = isMine ? 'none' : '1px solid #e5e7eb';
            
            let contentHtml = '';
            if (m.is_deleted) {
                contentHtml = `<em style="color: ${isMine ? '#fed7aa' : '#9ca3af'};">This message was deleted</em>`;
            } else {
                contentHtml = m.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }

            const deleteBtn = (isMine && !m.is_deleted) ? `
                <button onclick="deleteMessage(${m.id})" style="background:none; border:none; color: #fed7aa; cursor:pointer; font-size:0.7rem; padding:0; margin-top:0.2rem; opacity:0.8;">Delete</button>
            ` : '';

            html += `
                <div style="display: flex; flex-direction: column; align-items: ${align}; margin-bottom: 0.5rem; max-width: 100%;">
                    ${!isMine ? `<span style="font-size: 0.7rem; color: #6b7280; margin-bottom: 0.2rem; margin-left: 0.5rem;">${m.sender_username}</span>` : ''}
                    <div style="background: ${bubbleBg}; color: ${textColor}; padding: 0.6rem 1rem; border-radius: ${borderR}; max-width: 75%; box-shadow: ${shadow}; border: ${border}; word-break: break-word;">
                        ${contentHtml}
                    </div>
                    <div style="font-size: 0.7rem; color: #9ca3af; margin-top: 0.2rem; display: flex; gap: 0.5rem; align-items: center;">
                        <span>${timeStr}</span>
                        ${deleteBtn}
                    </div>
                </div>
            `;
        });

        msgsEl.innerHTML = html;
        
        // Auto scroll to bottom if we are not silent loading, or if we were already near bottom
        if(!silent) {
            msgsEl.scrollTop = msgsEl.scrollHeight;
        }

        // We marked messages as read on backend, so refresh list silently
        if(!silent) loadConversationsList(true);
        
    } catch (e) {
        if(!silent) console.error("Failed to load messages", e);
    }
}

async function sendMessage() {
    if (!currentConversationId) return;
    const input = document.getElementById('chat-message-input');
    const content = input.value.trim();
    if (!content) return;

    try {
        // We need the receiver_id, which we don't store directly on the client, 
        // but the backend accepts conversation_id in the url for sending now?
        // Wait, the API I wrote is: POST /api/messaging/conversations with {receiver_id, content}
        // Actually I wrote: POST /api/messaging/conversations/{conv_id}/messages!
        // Let's use that one.
        
        const response = await fetch(`${API_BASE_URL}/api/messaging/conversations/${currentConversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('np_token')}` },
            body: JSON.stringify({ content: content }) // Note: I need to update the backend route to accept this!
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Failed to send message");
        }
        
        input.value = '';
        await openConversation(currentConversationId, document.getElementById('chat-header').dataset.title);
        await loadConversationsList(true);
    } catch (e) {
        alert(e.message);
    }
}

async function deleteMessage(msgId) {
    if(!confirm("Are you sure you want to delete this message?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/messaging/messages/${msgId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('np_token')}` }
        });
        if (!response.ok) throw new Error("Failed to delete");
        
        await openConversation(currentConversationId, document.getElementById('chat-header').dataset.title, true);
        await loadConversationsList(true);
    } catch(e) {
        alert(e.message);
    }
}
