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
        <div class="coming-soon-container">
            <h1 class="gradient-text">Coming soon...</h1>
        </div>
    `;
}
