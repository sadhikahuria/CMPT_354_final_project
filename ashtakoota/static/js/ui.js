const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");
const discoverForm = document.getElementById("discover-form");
const authState = document.getElementById("auth-state");
const statusMessage = document.getElementById("status-message");
const discoverEmpty = document.getElementById("discover-empty");
const discoverResults = document.getElementById("discover-results");

document.addEventListener("DOMContentLoaded", () => {
    registerForm?.addEventListener("submit", handleRegister);
    loginForm?.addEventListener("submit", handleLogin);
    logoutButton?.addEventListener("click", handleLogout);
    discoverForm?.addEventListener("submit", handleDiscover);

    refreshSessionView();
});

async function handleRegister(event) {
    event.preventDefault();

    const payload = formToObject(registerForm);
    payload.rashi_id = Number(payload.rashi_id);
    payload.nakshatra_id = Number(payload.nakshatra_id);

    const response = await apiRequest("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        setStatus(response.payload?.message || "Registration failed.", "error");
        return;
    }

    loginForm.elements.email.value = payload.email;
    loginForm.elements.password.value = payload.password;
    setStatus("Account created. Signing you in next keeps the flow simple for this step.", "success");
}

async function handleLogin(event) {
    event.preventDefault();

    const payload = formToObject(loginForm);
    const response = await apiRequest("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        setStatus(response.payload?.message || "Login failed.", "error");
        return;
    }

    setStatus("Signed in. Discovery is ready below.", "success");
    await refreshSessionView();
    await loadDiscoverResults();
}

async function handleLogout() {
    const response = await apiRequest("/auth/logout", {
        method: "POST",
    });

    if (!response.ok) {
        setStatus(response.payload?.message || "Logout failed.", "error");
        return;
    }

    setStatus("Logged out. The discovery list is hidden until you sign in again.", "success");
    await refreshSessionView();
    renderDiscoverUsers([]);
}

async function handleDiscover(event) {
    event.preventDefault();
    await loadDiscoverResults();
}

async function refreshSessionView() {
    const response = await apiRequest("/auth/me");

    if (!response.ok) {
        authState.textContent = "Not signed in";
        logoutButton.disabled = true;
        discoverEmpty.textContent = "Sign in to load discoverable users.";
        return;
    }

    const user = response.payload.user;
    authState.textContent = `${user.username} (${user.email})`;
    logoutButton.disabled = false;
}

async function loadDiscoverResults() {
    const query = new URLSearchParams();
    const minAge = discoverForm.elements.min_age.value.trim();
    const maxAge = discoverForm.elements.max_age.value.trim();

    if (minAge) {
        query.set("min_age", minAge);
    }
    if (maxAge) {
        query.set("max_age", maxAge);
    }

    const url = query.toString() ? `/users/discover?${query.toString()}` : "/users/discover";
    const response = await apiRequest(url);

    if (!response.ok) {
        renderDiscoverUsers([]);
        setStatus(response.payload?.message || "Could not load discoverable users.", "error");
        return;
    }

    renderDiscoverUsers(response.payload.users);
    const totalUsers = response.payload.users.length;
    setStatus(`Loaded ${totalUsers} discoverable user${totalUsers === 1 ? "" : "s"}.`, "success");
}

function renderDiscoverUsers(users) {
    discoverResults.innerHTML = "";

    if (!users.length) {
        discoverResults.hidden = true;
        discoverEmpty.hidden = false;
        discoverEmpty.textContent = "No discoverable users match the current filters.";
        return;
    }

    discoverEmpty.hidden = true;
    discoverResults.hidden = false;

    users.forEach((user) => {
        const card = document.createElement("article");
        card.className = "discover-card";
        card.innerHTML = `
            <h3>${escapeHtml(user.username)}</h3>
            <p class="discover-meta">Age: ${user.age}</p>
            <p class="discover-meta">Location: ${escapeHtml(user.birth_location)}</p>
            <p class="discover-meta">Rashi: ${escapeHtml(user.rashi_name)}</p>
            <p class="discover-meta">Nakshatra: ${escapeHtml(user.nakshatra_name)}</p>
        `;
        discoverResults.appendChild(card);
    });
}

function setStatus(message, tone) {
    statusMessage.textContent = message;
    statusMessage.classList.remove("is-success", "is-error");

    if (tone === "success") {
        statusMessage.classList.add("is-success");
    } else if (tone === "error") {
        statusMessage.classList.add("is-error");
    }
}

function formToObject(form) {
    return Object.fromEntries(new FormData(form).entries());
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options,
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch (_error) {
        payload = null;
    }

    return { ok: response.ok, payload };
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
