const API_BASE_URL = 'http://localhost:8000';
let currentUser = null;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

function checkAuth() {
    const token = localStorage.getItem('np_token');
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
        localStorage.setItem('np_token', data.access_token);
        currentUser = data;
        buildDashboard();
    } catch (e) {
        err.textContent = e.message;
    }
}

// Signup logic moved to dashboard

function logout() {
    localStorage.removeItem('np_token');
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
        linksHTML = `<a class="sidebar-link active" onclick="loadStaffDashboard()">My Dashboard</a>`;
        loadStaffDashboard();
    } 
    else if (currentUser.role === 'manager') {
        linksHTML = `
            <a class="sidebar-link active" onclick="loadManagerStaff()">Manage Staff</a>
            <a class="sidebar-link" onclick="loadManagerEvents()">Manage Events</a>
            <a class="sidebar-link" onclick="loadManagerVolunteers()">Volunteer Applications</a>
            <a class="sidebar-link" onclick="loadCampaignAI()">AI Campaign Generator</a>
        `;
        loadManagerStaff();
    }
    else if (currentUser.role === 'head') {
        linksHTML = `
            <a class="sidebar-link active" onclick="loadHeadDashboard()">Overview Dashboard</a>
            <a class="sidebar-link" onclick="loadManagerStaff()">All Staff & Managers</a>
            <a class="sidebar-link" onclick="loadHeadRemovalRequests()">Staff Removal Requests</a>
            <a class="sidebar-link" onclick="loadHeadVolunteers()">Accepted Volunteers</a>
            <a class="sidebar-link" onclick="loadCampaignAI()">AI Campaign Generator</a>
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
                <div id="create-staff-form" class="hidden" style="margin: 1rem 0; padding: 1rem; background:#f9fafb; border-radius:0.5rem; display:flex; gap:1rem; flex-wrap:wrap;">
                    <input type="text" id="new-staff-user" placeholder="Username" class="auth-form" style="display:block;">
                    <input type="password" id="new-staff-pass" placeholder="Password" class="auth-form" style="display:block;">
                    ${currentUser.role === 'head' ? `
                    <select id="new-staff-role" class="auth-form" style="display:block;">
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                    </select>
                    ` : ''}
                    <button class="btn primary-btn" onclick="createStaff()">Create</button>
                </div>
                <br>
                <table>
                    <tr><th>Name</th><th>Username</th><th>Joined</th><th>Action</th></tr>
                    ${rows || '<tr><td colspan="4">No staff found.</td></tr>'}
                </table>
            </div>
        `;
    } catch(e) {
        main.innerHTML = `<p class="error-msg">Failed to load staff.</p>`;
    }
}

async function createStaff() {
    const user = document.getElementById('new-staff-user').value;
    const pass = document.getElementById('new-staff-pass').value;
    const roleEl = document.getElementById('new-staff-role');
    const role = roleEl ? roleEl.value : 'staff';
    
    if(!user || !pass) return alert("Username and password are required");

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.access_token}` },
            body: JSON.stringify({ username: user, password: pass, role: role })
        });
        
        if (!response.ok) throw new Error("Username taken or invalid");
        loadManagerStaff();
    } catch (e) {
        alert(e.message);
    }
}

async function removeStaff(id) {
    if(!confirm("Are you sure you want to remove this staff member?")) return;
    await fetch(`${API_BASE_URL}/api/manager/staff/${id}`, {
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
                    <button class="btn primary-btn" onclick="createEvent()">Save</button>
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

async function createEvent() {
    const title = document.getElementById('ev-title').value;
    const date = document.getElementById('ev-date').value;
    const desc = document.getElementById('ev-desc').value;
    if(!title || !date) return alert("Title and date required");
    
    await fetch(`${API_BASE_URL}/api/manager/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.access_token}` },
        body: JSON.stringify({ title, event_date: date, description: desc })
    });
    
    // Reset form fields and hide
    document.getElementById('ev-title').value = '';
    document.getElementById('ev-date').value = '';
    document.getElementById('ev-desc').value = '';
    showCreateEvent();
    
    loadManagerEvents();
}

async function markAttendancePrompt(eventId) {
    const staffId = prompt("Enter Staff ID to mark as attended:");
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
