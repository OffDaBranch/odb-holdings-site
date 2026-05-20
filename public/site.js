const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const menuToggle = document.getElementById("menu-toggle");
const headerLinks = document.getElementById("header-links");
const contactForm = document.querySelector("[data-contact-form]");
const contactStatus = document.querySelector("[data-contact-status]");
const publicIntakePath = "/api/intake";

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
  const sourceUrlField = contactForm.querySelector('input[name="source_url"]');
  const submittedAtField = contactForm.querySelector('input[name="submitted_at"]');
  const utmSourceField = contactForm.querySelector('input[name="utm_source"]');
  const utmMediumField = contactForm.querySelector('input[name="utm_medium"]');
  const utmCampaignField = contactForm.querySelector('input[name="utm_campaign"]');
  const searchParams = new URLSearchParams(window.location.search);

  if (sourceUrlField) {
    sourceUrlField.value = window.location.href;
  }

  if (utmSourceField) {
    utmSourceField.value = searchParams.get("utm_source") || "";
  }

  if (utmMediumField) {
    utmMediumField.value = searchParams.get("utm_medium") || "";
  }

  if (utmCampaignField) {
    utmCampaignField.value = searchParams.get("utm_campaign") || "";
  }

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
      if (submittedAtField) {
        submittedAtField.value = new Date().toISOString();
      }

      const formData = new FormData(contactForm);
      const payload = {
        name: String(formData.get("name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim() || null,
        company: String(formData.get("company") ?? "").trim() || null,
        inquiry_type: String(formData.get("inquiry_type") ?? "General Inquiry").trim() || "General Inquiry",
        message: String(formData.get("message") ?? "").trim(),
        source_url: String(formData.get("source_url") ?? window.location.href).trim(),
        utm_source: String(formData.get("utm_source") ?? "").trim() || null,
        utm_medium: String(formData.get("utm_medium") ?? "").trim() || null,
        utm_campaign: String(formData.get("utm_campaign") ?? "").trim() || null,
        submitted_at: String(formData.get("submitted_at") ?? "").trim() || new Date().toISOString(),
        consent_checkbox: formData.get("consent_checkbox") === "on",
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
