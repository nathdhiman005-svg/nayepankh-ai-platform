/**
 * script.js - Frontend JavaScript for NayePankh AI Assistant
 * 
 * This file handles:
 * 1. Navigation (scroll effects, mobile menu)
 * 2. AI Chatbot interaction
 * 3. Volunteer Recommendation form
 * 4. Campaign Content Generator
 * 5. Impact counter animations
 * 6. Scroll reveal animations
 * 7. Contact form handling
 */

// ============================================================
// Configuration
// ============================================================

// Backend API URL - change this if your backend runs on a different port
const API_BASE_URL = "http://localhost:8000";


// ============================================================
// 1. NAVIGATION
// ============================================================

// Navbar scroll effect - adds shadow when scrolled
const navbar = document.getElementById("navbar");

window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// Mobile menu toggle
const mobileToggle = document.getElementById("mobileToggle");
const navLinks = document.getElementById("navLinks");

mobileToggle.addEventListener("click", () => {
  navLinks.classList.toggle("active");
});

// Close mobile menu when a link is clicked
navLinks.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("active");
  });
});


// ============================================================
// 2. AI CHATBOT
// ============================================================

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const chatSuggestions = document.getElementById("chatSuggestions");

/**
 * Add a message to the chat window.
 * @param {string} text - The message text
 * @param {string} type - "user" or "bot"
 */
function addMessage(text, type) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;
  chatMessages.appendChild(messageDiv);
  // Scroll to bottom so the latest message is visible
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Show typing indicator (three bouncing dots).
 * @returns {HTMLElement} The typing indicator element (so we can remove it later)
 */
function showTypingIndicator() {
  const typingDiv = document.createElement("div");
  typingDiv.className = "message typing";
  typingDiv.innerHTML = `
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return typingDiv;
}

/**
 * Send a message to the AI chatbot.
 * @param {string} message - The user's message
 */
async function sendChatMessage(message) {
  if (!message.trim()) return;

  // Show user message
  addMessage(message, "user");

  // Clear input
  chatInput.value = "";

  // Hide suggestions after first message
  chatSuggestions.style.display = "none";

  // Show typing indicator
  const typingIndicator = showTypingIndicator();

  // Disable input while waiting for response
  chatInput.disabled = true;
  chatSendBtn.disabled = true;

  try {
    // Send message to backend
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message })
    });

    // Remove typing indicator
    typingIndicator.remove();

    if (!response.ok) {
      const error = await response.json();
      addMessage(`❌ Error: ${error.detail || "Something went wrong. Please try again."}`, "bot");
      return;
    }

    const data = await response.json();
    addMessage(data.response, "bot");

  } catch (error) {
    // Remove typing indicator
    typingIndicator.remove();
    addMessage("❌ Could not connect to the AI server. Please make sure the backend is running (uvicorn backend.main:app --port 8000) and Ollama is active.", "bot");
  } finally {
    // Re-enable input
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatInput.focus();
  }
}

// Send message on button click
chatSendBtn.addEventListener("click", () => {
  sendChatMessage(chatInput.value);
});

// Send message on Enter key
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendChatMessage(chatInput.value);
  }
});

// Handle suggestion button clicks
chatSuggestions.querySelectorAll(".chat-suggestion").forEach(btn => {
  btn.addEventListener("click", () => {
    const question = btn.getAttribute("data-question");
    sendChatMessage(question);
  });
});


// ============================================================
// 3. VOLUNTEER RECOMMENDATION
// ============================================================

const volunteerForm = document.getElementById("volunteerForm");
const volunteerSubmitBtn = document.getElementById("volunteerSubmitBtn");
const volunteerPlaceholder = document.getElementById("volunteerPlaceholder");
const volunteerContent = document.getElementById("volunteerContent");

volunteerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get form values
  const name = document.getElementById("volName").value;
  const interests = document.getElementById("volInterests").value;
  const skills = document.getElementById("volSkills").value;
  const availableTime = document.getElementById("volTime").value;

  // Validate
  if (!name || !interests || !skills || !availableTime) {
    showToast("Please fill in all fields!");
    return;
  }

  // Show loading state
  volunteerSubmitBtn.disabled = true;
  volunteerSubmitBtn.innerHTML = '<span class="spinner"></span> Generating...';

  // Hide placeholder and show loading in result area
  volunteerPlaceholder.style.display = "none";
  volunteerContent.style.display = "block";
  volunteerContent.innerHTML = `
    <div style="text-align:center; padding: 2rem;">
      <div class="spinner dark" style="width:40px;height:40px;border-width:4px;"></div>
      <p style="margin-top:1rem; color: var(--gray-500);">🤖 AI is analyzing your profile...</p>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE_URL}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        interests: interests,
        skills: skills,
        available_time: availableTime
      })
    });

    if (!response.ok) {
      const error = await response.json();
      volunteerContent.innerHTML = `<p style="color:var(--error);">❌ ${error.detail || "Something went wrong."}</p>`;
      return;
    }

    const data = await response.json();
    // Render the recommendation with markdown-style formatting
    volunteerContent.innerHTML = formatMarkdown(data.recommendation);

  } catch (error) {
    volunteerContent.innerHTML = `
      <p style="color:var(--error);">❌ Could not connect to the AI server. 
      Make sure the backend and Ollama are running.</p>
    `;
  } finally {
    volunteerSubmitBtn.disabled = false;
    volunteerSubmitBtn.innerHTML = '🔍 Get AI Recommendation';
  }
});


// Campaign logic moved to portal.js


// ============================================================
// 5. IMPACT COUNTER ANIMATION
// ============================================================

/**
 * Animate a number from 0 to a target value.
 * @param {HTMLElement} element - The element to animate
 * @param {number} target - The target number
 */
function animateCounter(element, target) {
  const duration = 2000; // 2 seconds
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out curve for natural feel
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(easeOut * target);

    // Format large numbers (e.g., 200000 -> 200K, 5000 -> 5K+)
    if (target >= 100000) {
      element.textContent = Math.floor(current / 1000) + "K+";
    } else if (target >= 1000) {
      element.textContent = (current / 1000).toFixed(current >= target ? 0 : 1) + "K+";
    } else {
      element.textContent = current + "+";
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// Track which counters have already been animated
const animatedCounters = new Set();

/**
 * Observe counters and trigger animation when they scroll into view.
 */
function setupCounterObserver() {
  const counters = document.querySelectorAll("[data-target]");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animatedCounters.has(entry.target)) {
        animatedCounters.add(entry.target);
        const target = parseInt(entry.target.getAttribute("data-target"));
        animateCounter(entry.target, target);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(counter => observer.observe(counter));
}


// ============================================================
// 6. SCROLL REVEAL ANIMATION
// ============================================================

function setupScrollReveal() {
  const reveals = document.querySelectorAll(".reveal");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
      }
    });
  }, { threshold: 0.15 });

  reveals.forEach(el => observer.observe(el));
}


// ============================================================
// 7. INITIATIVES SECTION (Dynamic)
// ============================================================

/**
 * Populate the initiatives section with cards.
 * Uses data from the NGO info JSON (fetched from backend or hardcoded fallback).
 */
function populateInitiatives(initiatives) {
  const grid = document.getElementById("initiativesGrid");
  grid.innerHTML = "";

  initiatives.forEach((init, index) => {
    const card = document.createElement("div");
    card.className = "initiative-card reveal";
    card.style.animationDelay = `${index * 0.1}s`;

    card.innerHTML = `
      <div class="initiative-icon">${init.icon}</div>
      <h3>${init.title}</h3>
      <p>${init.description}</p>
      <ul>
        ${init.activities.map(a => `<li>${a}</li>`).join("")}
      </ul>
    `;

    grid.appendChild(card);
  });

  // Re-setup scroll reveal for new elements
  setupScrollReveal();
}

// Fallback initiative data (in case backend is not running)
const fallbackInitiatives = [
  {
    icon: "📚",
    title: "Education",
    description: "Providing free education and learning resources to underprivileged children across India.",
    activities: ["Free tuition classes", "School supply distribution", "Mentorship programs", "Digital literacy workshops"]
  },
  {
    icon: "🏥",
    title: "Health Awareness",
    description: "Conducting health awareness campaigns, free medical check-ups, and distributing sanitary pads.",
    activities: ["Free medical check-up camps", "Sanitary pad distribution", "Health & hygiene sessions", "Mental health workshops"]
  },
  {
    icon: "💪",
    title: "Women Empowerment",
    description: "Empowering women through skill development, self-defense training, and menstrual hygiene awareness.",
    activities: ["Skill development training", "Self-defense workshops", "Menstrual hygiene campaigns", "Entrepreneurship support"]
  },
  {
    icon: "🍲",
    title: "Food Distribution",
    description: "Distributing free food to the hungry and homeless through regular food drives and community kitchens.",
    activities: ["Daily food distribution", "Community kitchen programs", "Festival food drives", "Emergency food relief"]
  },
  {
    icon: "🌱",
    title: "Environmental Campaigns",
    description: "Organizing tree plantation drives, cleanliness campaigns, and environmental awareness programs.",
    activities: ["Tree plantation drives", "Cleanliness campaigns", "Plastic-free programs", "Environmental education"]
  }
];


// ============================================================
// 8. CONTACT FORM
// ============================================================

const contactForm = document.getElementById("contactForm");

contactForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // In a real app, this would send data to a backend
  showToast("✅ Thank you for your message! We'll get back to you soon.");
  contactForm.reset();
});


// ============================================================
// 8.5 VOLUNTEER APPLICATION MODAL
// ============================================================

const applyVolunteerBtn = document.getElementById("applyVolunteerBtn");
const volunteerModal = document.getElementById("volunteerModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const volunteerApplicationForm = document.getElementById("volunteerApplicationForm");
const appSubmitBtn = document.getElementById("appSubmitBtn");

/**
 * Open the volunteer application modal.
 */
function openVolunteerModal() {
  volunteerModal.classList.add("active");
  document.body.style.overflow = "hidden"; // Prevent background scroll
}

/**
 * Close the volunteer application modal.
 */
function closeVolunteerModal() {
  volunteerModal.classList.remove("active");
  document.body.style.overflow = ""; // Restore scroll
}

// Open modal on button click
applyVolunteerBtn.addEventListener("click", openVolunteerModal);

// Close modal on X button click
modalCloseBtn.addEventListener("click", closeVolunteerModal);

// Close modal on overlay click (outside the form)
volunteerModal.addEventListener("click", (e) => {
  if (e.target === volunteerModal) {
    closeVolunteerModal();
  }
});

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && volunteerModal.classList.contains("active")) {
    closeVolunteerModal();
  }
});

/**
 * Handle volunteer application form submission.
 */
volunteerApplicationForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("appName").value.trim();
  const email = document.getElementById("appEmail").value.trim();
  const phone = document.getElementById("appPhone").value.trim();
  const role = document.getElementById("appRole").value;

  if (!name || !email || !phone || !role) {
    showToast("⚠️ Please fill in all fields!");
    return;
  }

  const phonePattern = /^\d{10}$/;
  if (!phonePattern.test(phone)) {
    showToast("⚠️ Phone number must be exactly 10 digits!");
    return;
  }

  // Show loading state
  appSubmitBtn.disabled = true;
  appSubmitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

  try {
    const response = await fetch(`${API_BASE_URL}/api/volunteer-apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, role })
    });

    if (!response.ok) {
      const error = await response.json();
      showToast(`❌ ${error.detail || "Something went wrong. Please try again."}`);
      return;
    }

    // Show success state inside the modal
    const modalContainer = volunteerModal.querySelector(".modal-container");
    modalContainer.innerHTML = `
      <button class="modal-close" id="modalCloseBtnSuccess" aria-label="Close modal">&times;</button>
      <div class="modal-success">
        <div class="success-icon">🎉</div>
        <h3>Application Submitted!</h3>
        <p>Thank you, <strong>${name}</strong>! Your volunteer application for <strong>${role}</strong> has been received. We'll reach out to you at <strong>${email}</strong> soon.</p>
      </div>
    `;

    // Attach close handler to the new close button
    document.getElementById("modalCloseBtnSuccess").addEventListener("click", () => {
      closeVolunteerModal();
      // Reset the modal content after closing (with a delay for the animation)
      setTimeout(() => { location.reload(); }, 300);
    });

  } catch (error) {
    showToast("❌ Could not connect to the server. Please make sure the backend is running.");
  } finally {
    appSubmitBtn.disabled = false;
    appSubmitBtn.innerHTML = '🚀 Submit Application';
  }
});


// ============================================================
// 9. UTILITY FUNCTIONS
// ============================================================

/**
 * Show a toast notification.
 * @param {string} message - The message to display
 */
function showToast(message) {
  // Remove existing toast if any
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => toast.remove(), 3000);
}

/**
 * Simple markdown-to-HTML formatter.
 * Handles bold (**text**), headers, bullet points, and emojis.
 * @param {string} text - The markdown text
 * @returns {string} HTML string
 */
function formatMarkdown(text) {
  return text
    // Bold text: **text** -> <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Headers: ### text -> <h4>text</h4>
    .replace(/^### (.*$)/gm, "<h4 style='margin:1rem 0 0.5rem;color:var(--gray-900)'>$1</h4>")
    .replace(/^## (.*$)/gm, "<h3 style='margin:1.2rem 0 0.5rem;color:var(--gray-900)'>$1</h3>")
    // Horizontal rules
    .replace(/^---$/gm, "<hr style='margin:1rem 0;border:none;border-top:1px solid var(--gray-200);'>")
    // Bullet points: - text -> <li>text</li>
    .replace(/^- (.*$)/gm, "<li style='margin-left:1.2rem;margin-bottom:0.3rem;list-style:disc;color:var(--gray-700)'>$1</li>")
    // Line breaks
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}


// ============================================================
// 10. INITIALIZATION
// ============================================================

/**
 * Initialize the page when it loads.
 */
async function init() {
  // Setup scroll reveal animations
  setupScrollReveal();

  // Setup counter animations
  setupCounterObserver();

  // Try to load initiatives from backend, fall back to hardcoded data
  try {
    const response = await fetch(`${API_BASE_URL}/api/ngo-info`);
    if (response.ok) {
      const data = await response.json();
      populateInitiatives(data.initiatives);
    } else {
      populateInitiatives(fallbackInitiatives);
    }
  } catch (error) {
    // Backend not running - use fallback data
    console.log("Backend not available, using fallback data.");
    populateInitiatives(fallbackInitiatives);
  }
}

// Run initialization when the page loads
document.addEventListener("DOMContentLoaded", init);
