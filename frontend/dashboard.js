
const logoutBtn = document.getElementById("logoutBtn");
const message = document.getElementById("message");

// Logout
logoutBtn.addEventListener("click", async function() {
    try {
        const response = await fetch("/logout", {
            method: "POST"
        });

        const result = await response.json();

        message.innerHTML = result.message;
        message.style.color = "green";

        window.location.href = "login.html";

    } catch (error) {
        message.innerHTML = "Logout failed!";
        message.style.color = "red";
    }
});

// Display Login History
async function loadHistory() {
    const response = await fetch("/history");
    const history = await response.json();

    const historyDiv = document.getElementById("history");

    if (!response.ok || history.length === 0) {
        historyDiv.innerHTML = "No login history available.";
        return;
    }

    historyDiv.innerHTML = history.map(item => `
        <p>
            Status: ${item.status} |
            Time: ${item.time}
        </p>
    `).join("");
}

// Display Account Status
async function loadAccountStatus() {
    const response = await fetch("/account-status");
    const result = await response.json();

    if (response.ok) {
        document.getElementById("accountStatus").innerHTML = result.status;
    }
}

loadHistory();
loadAccountStatus();
