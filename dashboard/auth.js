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
    // 1. Get user's owned servers from Discord API
    const { data: userGuilds, error: discordError } = await fetchDiscordGuilds();
    if (discordError) throw discordError;

    // 2. Get servers where bot exists from Supabase
    const { data: botGuilds, error: supabaseError } = await supabase
      .from('bot_guilds')
      .select('guild_id');
    
    if (supabaseError) throw supabaseError;

    // 3. Create Set for quick lookup
    const botGuildIds = new Set(botGuilds.map(g => g.guild_id));

    // 4. Filter to only show servers where:
    //    - User has admin/owner permissions
    //    - Bot is present
    const validServers = userGuilds.filter(guild => {
      const hasPermissions = guild.owner || (BigInt(guild.permissions) & BigInt(0x8));
      return hasPermissions && botGuildIds.has(guild.id);
    });

    // 5. Render only valid servers
    const serversContainer = document.getElementById('owned-servers');
    
    if (validServers.length === 0) {
      serversContainer.innerHTML = `
        <div class="no-bot-servers">
          <i class="fas fa-robot"></i>
          <p>Your bot isn't in any of your servers</p>
          <button onclick="window.location.href='https://discord.com/oauth2/authorize?client_id=1388167308358189136&permissions=8&integration_type=0&scope=bot'">
            Add Bot to Server
          </button>
        </div>
      `;
      return;
    }

    serversContainer.innerHTML = validServers.map(guild => `
      <div class="server-card">
        ${guild.icon 
          ? `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128" alt="${guild.name}">`
          : `<div class="default-icon">${guild.name.charAt(0)}</div>`
        }
        <h3>${guild.name}</h3>
        <button class="manage-btn" data-guild-id="${guild.id}">
          <i class="fas fa-cog"></i> Manage
        </button>
      </div>
    `).join('');

  } catch (error) {
    console.error('Server load failed:', error);
    document.getElementById('owned-servers').innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${error.message}</p>
      </div>
    `;
  }
}
