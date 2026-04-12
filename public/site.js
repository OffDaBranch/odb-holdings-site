const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const menuToggle = document.getElementById("menu-toggle");
const headerLinks = document.getElementById("header-links");
const contactForm = document.querySelector("[data-contact-form]");
const contactStatus = document.querySelector("[data-contact-status]");
const publicIntakePath = "/api/public/intake/contact";

function setMenuState(isOpen) {
  if (!headerLinks || !menuToggle) {
    return;
  }

  headerLinks.dataset.open = String(isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("menu-open", isOpen);
}

function resolvePublicIntakeEndpoint() {
  const explicitBaseUrl = document
    .querySelector('meta[name="branchops-public-api-base"]')
    ?.getAttribute("content")
    ?.trim();

  if (explicitBaseUrl) {
    return `${explicitBaseUrl.replace(/\/$/, "")}${publicIntakePath}`;
  }

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `http://localhost:4000${publicIntakePath}`;
  }

  return `${window.location.origin}${publicIntakePath}`;
}

if (menuToggle && headerLinks) {
  menuToggle.addEventListener("click", () => {
    setMenuState(headerLinks.dataset.open !== "true");
  });

  headerLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      setMenuState(false);
    });
  });
}

if (!prefersReducedMotion && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
} else {
  document.querySelectorAll(".reveal").forEach((element) => element.classList.add("visible"));
}

if (contactForm && contactStatus) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const previousLabel = submitButton?.textContent ?? "Send inquiry";

    contactStatus.textContent = "Sending your inquiry...";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      const formData = new FormData(contactForm);
      const payload = {
        sourceSite: "odb-holdings-site",
        inquiryType: String(formData.get("inquiryType") ?? "general").trim() || "general",
        name: String(formData.get("name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim(),
        companyName: String(formData.get("companyName") ?? "").trim() || null,
        phone: String(formData.get("phone") ?? "").trim() || null,
        message: String(formData.get("message") ?? "").trim(),
        website: String(formData.get("website") ?? "").trim(),
      };

      const response = await fetch(resolvePublicIntakeEndpoint(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(responseBody?.message || "The inquiry could not be sent right now. Please try again shortly.");
      }

      contactForm.reset();
      contactStatus.textContent =
        "Your inquiry was received. Branch Off Holdings will follow up through your provided email.";
    } catch (error) {
      contactStatus.textContent =
        error instanceof Error ? error.message : "The inquiry could not be sent right now. Please try again shortly.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = previousLabel;
      }
    }
  });
}
