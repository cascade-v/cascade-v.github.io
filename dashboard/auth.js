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

async function fetchDiscordGuilds() {
  try {
    // Get the user's Discord access token from Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    
    if (!session?.provider_token) {
      throw new Error('No Discord access token found');
    }

    // Fetch user's guilds from Discord API
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        'Authorization': `Bearer ${session.provider_token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    return { data: await response.json(), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function displayOwnedServers(user) {
  const serversContainer = document.getElementById('owned-servers');
  
  try {
    // Show loading state with blur
    serversContainer.innerHTML = `
      <div class="servers-loading-container">
        <div class="servers-loading-blur"></div>
        <div class="servers-loading-content">
          <div class="spinner"></div>
          <p>Loading servers...</p>
        </div>
      </div>
    `;

    // 1. Get user's guilds from Discord API
    const { data: userGuilds, error: discordError } = await fetchDiscordGuilds();
    if (discordError) throw discordError;

    // 2. Get bot's guilds from Supabase
    const { data: botGuilds, error: supabaseError } = await supabase
      .from('bot_guilds')
      .select('guild_id');
    
    if (supabaseError) throw supabaseError;

    // 3. Filter servers (user must be admin/owner and bot must be in server)
    const botGuildIds = new Set(botGuilds.map(g => g.guild_id));
    
    const validServers = userGuilds.filter(guild => {
      const hasAdmin = guild.owner || (BigInt(guild.permissions) & BigInt(0x8));
      return hasAdmin && botGuildIds.has(guild.id);
    });

    // 4. Render results
    if (validServers.length === 0) {
      serversContainer.innerHTML = `
        <div class="no-servers">
          <i class="fas fa-robot"></i>
          <h3>No Managed Servers Found</h3>
          <p>Your bot isn't in any servers you administer</p>
          <a href="https://discord.com/oauth2/authorize?client_id=YOUR_BOT_ID&scope=bot" 
             class="btn btn-primary" 
             target="_blank">
            <i class="fas fa-plus"></i> Add Bot to Server
          </a>
        </div>
      `;
      return;
    }

    // Render server cards
    serversContainer.innerHTML = `
      <div class="servers-grid">
        ${validServers.map(guild => `
          <div class="server-card" data-guild-id="${guild.id}">
            <div class="server-icon">
              ${guild.icon 
                ? `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128" 
                      alt="${guild.name}" 
                      loading="lazy">`
                : `<div class="default-icon">${guild.name.charAt(0)}</div>`
              }
            </div>
            <div class="server-info">
              <h3 class="server-name">${guild.name}</h3>
              <div class="server-meta">
                <span><i class="fas fa-crown"></i> ${guild.owner ? 'Owner' : 'Admin'}</span>
              </div>
            </div>
            <div class="server-actions">
              <button class="btn btn-primary" onclick="manageServer('${guild.id}')">
                <i class="fas fa-cog"></i> Manage
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

  } catch (error) {
    console.error('Server load failed:', error);
    serversContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error Loading Servers</h3>
        <p>${error.message || 'Failed to fetch server data'}</p>
        <button class="btn btn-secondary" onclick="window.location.reload()">
          <i class="fas fa-sync-alt"></i> Try Again
        </button>
      </div>
    `;
  }
}
