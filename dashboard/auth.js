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


async function showDashboard(user) {
    try {
        // Load the dashboard template
        const response = await fetch('dashboard.html');
        const html = await response.text();
        document.getElementById('main-content').innerHTML = html;
        
        // Now fetch and display owned servers
        await displayOwnedServers(user);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('main-content').innerHTML = `
            <div class="error-container">
                <h1>Failed to load dashboard</h1>
                <p>${error.message}</p>
            </div>
        `;
    }
}

async function displayOwnedServers(user) {
    try {
        // Get the user's Discord access token
        const { data, error } = await window.supabase.auth.getSession();
        if (error) throw error;
        
        const discordToken = data.session.provider_token;
        
        // Fetch user's guilds from Discord API
        const response = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
                'Authorization': `Bearer ${discordToken}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch servers');
        
        const guilds = await response.json();
        
        // Filter to only show guilds where the user is owner (permissions & owner flag)
        const ownedGuilds = guilds.filter(guild => {
            // Check if user is owner (permissions bitmask includes ADMINISTRATOR or is owner)
            const permissions = BigInt(guild.permissions);
            const isAdmin = (permissions & BigInt(0x8)) !== BigInt(0); // ADMINISTRATOR permission
            return isAdmin || guild.owner;
        });
        
        // Display the owned guilds
        const serversContainer = document.getElementById('owned-servers');
        
        if (ownedGuilds.length === 0) {
            serversContainer.innerHTML = '<p class="no-servers">You don\'t own any servers.</p>';
            return;
        }
        
        serversContainer.innerHTML = ownedGuilds.map(guild => `
            <div class="server-card">
                <div class="server-icon">
                    ${guild.icon 
                        ? `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128" alt="${guild.name}">`
                        : `<div class="default-icon">${guild.name.charAt(0)}</div>`
                    }
                </div>
                <h3>${guild.name}</h3>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading servers:', error);
        document.getElementById('owned-servers').innerHTML = `
            <div class="error-message">
                Failed to load your servers: ${error.message}
            </div>
        `;
    }
}
