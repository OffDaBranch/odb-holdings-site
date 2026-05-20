const authForm = document.querySelector("[data-admin-auth]");
const adminStatus = document.querySelector("[data-admin-status]");
const leadsBody = document.querySelector("[data-leads-body]");
const refreshButton = document.querySelector("[data-refresh-leads]");
const exportButton = document.querySelector("[data-export-csv]");

let adminToken = "";

function setStatus(message) {
  if (adminStatus) {
    adminStatus.textContent = message;
  }
}

function clearRows() {
  if (leadsBody) {
    leadsBody.replaceChildren();
  }
}

function appendCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value === null || value === undefined || value === "" ? "-" : String(value);
  row.appendChild(cell);
}

function renderEmpty(message) {
  if (!leadsBody) {
    return;
  }

  clearRows();
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 7;
  cell.textContent = message;
  row.appendChild(cell);
  leadsBody.appendChild(row);
}

function renderLeads(leads) {
  if (!Array.isArray(leads) || leads.length === 0) {
    renderEmpty("No leads found.");
    return;
  }

  clearRows();
  leads.forEach((lead) => {
    const row = document.createElement("tr");
    appendCell(row, lead.submitted_at);
    appendCell(row, lead.inquiry_type);
    appendCell(row, `${lead.name} / ${lead.company || "No company"} / ${lead.email}`);
    appendCell(row, lead.lead_score);
    appendCell(row, lead.urgency);
    appendCell(row, lead.recommended_next_action);
    appendCell(row, lead.status);
    leadsBody.appendChild(row);
  });
}

async function fetchWithAuth(path) {
  if (!adminToken) {
    throw new Error("Enter the admin bearer token first.");
  }

  const response = await fetch(path, {
    headers: {
      authorization: `Bearer ${adminToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || "The admin request failed.");
  }

  return response;
}

async function loadLeads() {
  setStatus("Loading leads...");
  const response = await fetchWithAuth("/api/admin/leads");
  const body = await response.json();
  renderLeads(body.leads);
  setStatus(`Loaded ${body.leads.length} lead${body.leads.length === 1 ? "" : "s"}. Request ${body.request_id}.`);
}

async function exportCsv() {
  setStatus("Preparing CSV...");
  const response = await fetchWithAuth("/api/admin/export.csv");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "branchops-intake-leads.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus(`CSV export complete. Request ${response.headers.get("x-request-id") || "unknown"}.`);
}

authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(authForm);
  adminToken = String(formData.get("token") ?? "").trim();

  try {
    await loadLeads();
  } catch (error) {
    renderEmpty("Unable to load leads.");
    setStatus(error instanceof Error ? error.message : "Unable to load leads.");
  }
});

refreshButton?.addEventListener("click", async () => {
  try {
    await loadLeads();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to refresh leads.");
  }
});

exportButton?.addEventListener("click", async () => {
  try {
    await exportCsv();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to export CSV.");
  }
});
