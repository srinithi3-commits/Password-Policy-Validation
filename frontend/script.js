
const password = document.getElementById("password");
const message = document.getElementById("message");
const form = document.getElementById("registerForm");

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    let pass = password.value;

    let uppercase = /[A-Z]/.test(pass);
    let lowercase = /[a-z]/.test(pass);
    let number = /[0-9]/.test(pass);
    let special = /[!@#$%^&*]/.test(pass);
    let length = pass.length >= 8;

    let errors = [];

    if (!uppercase) {
        errors.push("Add at least one uppercase letter.");
    }

    if (!lowercase) {
        errors.push("Add at least one lowercase letter.");
    }

    if (!number) {
        errors.push("Add at least one number.");
    }

    if (!special) {
        errors.push("Add at least one special character (!@#$%^&*).");
    }

    if (!length) {
        errors.push("Password must contain at least 8 characters.");
    }

    if (errors.length > 0) {
        message.innerHTML = errors.join("<br>");
        message.style.color = "red";
        return;
    }

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;

    try {
        const response = await fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: pass
            })
        });

        const result = await response.json();

        message.innerHTML = result.message;
        message.style.color = response.ok ? "green" : "red";

    } catch (error) {
        message.innerHTML = "Server connection failed!";
        message.style.color = "red";
    }
});
