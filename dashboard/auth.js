// Auth functions - uses window.supabase
function checkAuth() {
    if (!window.supabase) {
        console.error('Supabase client not initialized');
        return;
    }

    window.supabase.auth.getSession()
        .then(({ data: { session }, error }) => {
            if (session) {
                showDashboard(session.user);
            } else {
                // If we get here, it means we have no session but weren't redirected
                window.location.href = 'auth.html';
            }
        })
        .catch(error => {
            console.error('Auth check failed:', error);
            window.location.href = 'auth.html';
        });
}

async function handleOAuthCallback() {
    try {
        const { data: { session }, error } = await window.supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
            window.history.replaceState({}, '', window.location.pathname);
            showDashboard(session.user);
        } else {
            window.location.href = 'auth.html';
        }
    } catch (error) {
        console.error('OAuth failed:', error);
        window.location.href = 'auth.html';
    }
}

function showDashboard(user) {
    document.getElementById('auth-state').innerHTML = `
        <span>Hi, ${user.user_metadata.full_name || 'Admin'}!</span>
        <button id="logout-btn">Logout</button>
    `;

    document.getElementById('logout-btn').addEventListener('click', () => {
        window.supabase.auth.signOut()
            .then(() => window.location.href = 'auth.html');
    });

    document.getElementById('main-content').innerHTML = `
        <div class="dashboard">
            <h2>Your Server Dashboard</h2>
            <div class="server-list">
                <div class="server-card">
                    <i class="fas fa-server"></i>
                    <h3>Your Server</h3>
                    <button class="manage-btn">Manage</button>
                </div>
            </div>
        </div>
    `;
}
