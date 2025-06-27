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
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('code')) {
                    handleOAuthCallback();
                } else {
                    // Automatically redirect to OAuth
                    redirectToOAuth();
                }
            }
        })
        .catch(error => {
            console.error('Auth check failed:', error);
            redirectToOAuth();
        });
}

async function redirectToOAuth() {
    try {
        const { error } = await window.supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        
        if (error) throw error;
    } catch (error) {
        console.error('OAuth redirect failed:', error);
        // Fallback to showing error message
        document.getElementById('main-content').innerHTML = `
            <div class="login-container">
                <h2>Welcome to Sentinel</h2>
                <p class="error">Login failed: ${error.message}</p>
                <a href="#" onclick="redirectToOAuth()" class="login-btn main-login">
                    <i class="fab fa-discord"></i> Retry Login
                </a>
            </div>
        `;
    }
}

async function handleOAuthCallback() {
    try {
        const { data: { session }, error } = await window.supabase.auth.getSession();
        if (error) throw error;
        
        window.history.replaceState({}, '', window.location.pathname);
        showDashboard(session.user);
    } catch (error) {
        console.error('OAuth failed:', error);
        redirectToOAuth();
    }
}

function showDashboard(user) {
    document.getElementById('auth-state').innerHTML = `
        <span>Hi, ${user.user_metadata.full_name || 'Admin'}!</span>
        <button id="logout-btn">Logout</button>
    `;

    document.getElementById('logout-btn').addEventListener('click', () => {
        window.supabase.auth.signOut()
            .then(() => window.location.reload());
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
