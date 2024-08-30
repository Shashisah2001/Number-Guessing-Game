// Base API URL
const apiUrl = "http://localhost:3000";

// DOM Element selectors
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const guessNumberForm = document.getElementById("guessNumberForm");
const setNumberForm = document.getElementById("setNumberForm");
const logoutButtons = document.querySelectorAll("#logoutBtn");
const detailsBtn = document.getElementById("detailsBtn");
const detailsSection = document.getElementById("detailsSection");
const detailsTableBody = document.getElementById("detailsTableBody");
const adminNameSpan = document.getElementById("adminName");
const adminNumberInput = document.getElementById("adminNumber");
const amountInput = document.getElementById("amount");
const guessNumberInput = document.getElementById("guessNumber");
const walletSpan = document.getElementById("wallet");
const messageDiv = document.getElementById("message");

// Utility function to handle API requests
async function fetchData(url, method, data) {
  const response = await fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

// Utility function to display messages
function displayMessage(message, isSuccess = true) {
  messageDiv.textContent = message;
  messageDiv.style.color = isSuccess ? "green" : "red";
  messageDiv.style.display = "block";
}

// Handle login form submission
loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const result = await fetchData(`${apiUrl}/login`, "POST", {
      username,
      password,
    });

    if (result.success) {
      localStorage.setItem("username", username);
      window.location.href = result.redirectUrl;
    } else {
      displayMessage(result.message, false);
    }
  } catch (error) {
    displayMessage(
      "Failed to connect to server. Please try again later.",
      false
    );
  }
});

//Signup
async function signUp() {
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const result = await fetchData(`${apiUrl}/signup`, "POST", {
    username,
    email,
    password,
    role,
  });
  // console.log("result", result);
  if (result.success) {
    displayMessage(result.message);
    window.location.href = result.redirectUrl;
  } else {
    displayMessage(result.message, false);
  }
}

// Assuming you have stored the username in localStorage after login
document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("username");

  if (username) {
    const greetingMessage = `Welcome ${username}`;
    document.getElementById("greetingMessage").innerText = greetingMessage;
  }
});

// Handle admin number and amount setting
setNumberForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const number = adminNumberInput.value;
  const amount = amountInput.value;

  const result = await fetchData(`${apiUrl}/set-number`, "POST", {
    number,
    amount,
  });

  displayMessage(result.message, result.success);
});

// Handle user guessing a number
guessNumberForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const number = guessNumberInput.value;

  const result = await fetchData(`${apiUrl}/guess-number`, "POST", { number });

  if (result.success) {
    walletSpan.textContent = `Wallet:Rs: ${result.wallet}`;
  }
  displayMessage(result.message, result.success);
});

// Handle logout
logoutButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const result = await fetchData(`${apiUrl}/logout`, "POST");
    if (result.success) {
      window.location.href = "/login";
    } else {
      displayMessage("Logout failed", false);
    }
  });
});

// Toggle details section visibility and populate the table
detailsBtn?.addEventListener("click", async () => {
  const isVisible = detailsSection.style.display === "block";
  detailsSection.style.display = isVisible ? "none" : "block";

  if (!isVisible) {
    try {
      const result = await fetchData(`${apiUrl}/details`, "GET");

      detailsTableBody.innerHTML = result.details
        .map((item) => {
          const number = item.number !== "-" ? item.number : "-";
          const status = item.status !== "-" ? item.status : "-";

          return `
            <tr>
              <td>${item.username}</td>
              <td>${item.email}</td>
              <td>${number}</td>
              <td>${status}</td>
              <td>${item.wallet}</td>
            </tr>`;
        })
        .join("");
    } catch (error) {
      console.error("Error fetching details:", error);
    }
  }
});
