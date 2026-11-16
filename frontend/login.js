
const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const result = await response.json();

        message.innerHTML = result.message;
        message.style.color = response.ok ? "green" : "red";

        if (response.ok) {
            window.location.href = "dashboard.html";
        }

    } catch (error) {
        message.innerHTML = "Server connection failed!";
        message.style.color = "red";
    }
});
