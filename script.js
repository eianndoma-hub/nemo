/* Pawfolio keeps the complete record set in this browser's local storage. */
const STORAGE_KEY = "pawfolio-records-v1";
const BREED_KEY = "pawfolio-breeds-v1";
// Breed options are grouped by species and can be extended from the pet form.
const DEFAULT_BREEDS = {
  Dog: ["Aspin", "Beagle", "Golden Retriever", "Labrador", "Poodle", "Shih Tzu"],
  Cat: ["American Shorthair", "Bengal", "Domestic Shorthair", "Persian", "Siamese"],
  Bird: ["Budgerigar", "Cockatiel", "Lovebird", "Parrot"],
  Rabbit: ["Dutch", "Lionhead", "Mini Lop", "Rex"],
  Other: ["Mixed", "Unknown"]
};
// Seed a useful first-run experience; saved browser data always takes precedence.
const SAMPLE_DATA = {
  owners: [
    { id: "owner-101", name: "Mia Santos", phone: "+1 (555) 204-1187", email: "mia.santos@example.com", address: "18 Willow Lane, Portland" },
    { id: "owner-102", name: "Oliver Chen", phone: "+1 (555) 319-4402", email: "oliver.chen@example.com", address: "72 Cedar Street, Seattle" },
    { id: "owner-103", name: "Sofia Rivera", phone: "+1 (555) 867-2231", email: "sofia.rivera@example.com", address: "5 Meadow Court, Austin" }
  ],
  pets: [
    { id: "pet-1001", name: "Biscuit", species: "Dog", breed: "Golden Retriever", sex: "Male", dob: "2021-05-14", color: "Honey gold", weight: 28.4, photo: "", ownerId: "owner-101", createdAt: "2025-01-12" },
    { id: "pet-1002", name: "Mochi", species: "Cat", breed: "Domestic Shorthair", sex: "Female", dob: "2022-09-03", color: "Cream & white", weight: 4.2, photo: "", ownerId: "owner-102", createdAt: "2025-02-08" },
    { id: "pet-1003", name: "Pip", species: "Bird", breed: "Cockatiel", sex: "Male", dob: "2023-02-19", color: "Gray & yellow", weight: 0.09, photo: "", ownerId: "owner-103", createdAt: "2025-03-01" },
    { id: "pet-1004", name: "Clover", species: "Dog", breed: "Aspin", sex: "Female", dob: "2020-11-27", color: "Black & tan", weight: 16.8, photo: "", ownerId: "owner-101", createdAt: "2025-03-15" }
  ],
  vaccinations: [
    { id: "vax-2001", petId: "pet-1001", name: "Rabies", dateGiven: "2025-11-20", nextDue: "2026-11-20", veterinarian: "Dr. Harper", notes: "Annual booster" },
    { id: "vax-2002", petId: "pet-1001", name: "DHPP", dateGiven: "2026-04-14", nextDue: "2026-11-12", veterinarian: "Dr. Harper", notes: "" },
    { id: "vax-2003", petId: "pet-1002", name: "Rabies", dateGiven: "2025-10-02", nextDue: "2026-10-20", veterinarian: "Dr. Patel", notes: "" },
    { id: "vax-2004", petId: "pet-1003", name: "Avian Polyomavirus", dateGiven: "2026-02-12", nextDue: "2026-11-04", veterinarian: "Dr. Lee", notes: "Wellness visit" }
  ]
};

let state = loadRecords();
let breeds = loadBreeds();
let currentPage = "dashboard";
let petSearch = "";
let activeOwnerFilter = "";
let activeBreedFilter = "";
let activeSpeciesFilter = "";

// Load and persist the records and customizable breed catalog.
function loadRecords() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_DATA));
    return structuredClone(SAMPLE_DATA);
  }
  try {
    const parsed = JSON.parse(saved);
    if (parsed && Array.isArray(parsed.pets) && Array.isArray(parsed.owners) && Array.isArray(parsed.vaccinations)) return parsed;
    throw new Error("Stored records have an invalid format.");
  } catch (error) {
    console.error("Unable to load Pawfolio records from localStorage.", error);
    return structuredClone(SAMPLE_DATA);
  }
}

function loadBreeds() {
  const saved = localStorage.getItem(BREED_KEY);
  if (!saved) {
    localStorage.setItem(BREED_KEY, JSON.stringify(DEFAULT_BREEDS));
    return structuredClone(DEFAULT_BREEDS);
  }
  try {
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ...structuredClone(DEFAULT_BREEDS), ...parsed };
    }
    throw new Error("Stored breed list has an invalid format.");
  } catch (error) {
    console.error("Unable to load Pawfolio breeds from localStorage.", error);
    return structuredClone(DEFAULT_BREEDS);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function persistBreeds() {
  localStorage.setItem(BREED_KEY, JSON.stringify(breeds));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function ownerFor(pet) {
  return state.owners.find(owner => owner.id === pet.ownerId);
}

function petFor(id) {
  return state.pets.find(pet => pet.id === id);
}

function vaccineStatus(vaccine) {
  const days = Math.ceil((new Date(`${vaccine.nextDue}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);
  if (days < 0) return { label: "Overdue", className: "status-overdue", days };
  if (days <= 30) return { label: "Due soon", className: "status-due-soon", days };
  return { label: "Up to date", className: "status-up-to-date", days };
}

function allSearchText(pet) {
  const owner = ownerFor(pet);
  return [pet.name, pet.breed, pet.species, owner?.name].join(" ").toLowerCase();
}

function filteredPets() {
  return state.pets.filter(pet =>
    (!petSearch || allSearchText(pet).includes(petSearch.toLowerCase())) &&
    (!activeOwnerFilter || pet.ownerId === activeOwnerFilter) &&
    (!activeBreedFilter || pet.breed === activeBreedFilter) &&
    (!activeSpeciesFilter || pet.species === activeSpeciesFilter)
  );
}

function avatarMarkup(pet, className = "pet-avatar") {
  const photo = pet.photo ? `<img src="${escapeHtml(pet.photo)}" alt="">` : "🐾";
  return `<span class="${className}">${photo}</span>`;
}

function ownerOptions(selectedId = "") {
  return state.owners.map(owner =>
    `<option value="${escapeHtml(owner.id)}" ${owner.id === selectedId ? "selected" : ""}>${escapeHtml(owner.name)}</option>`
  ).join("");
}

function setPage(page) {
  currentPage = page;
  document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.page === page));
  document.getElementById("pageCrumb").textContent = page.charAt(0).toUpperCase() + page.slice(1);
  renderPage();
}

function renderPage() {
  const content = document.getElementById("pageContent");
  if (currentPage === "dashboard") content.innerHTML = renderDashboard();
  else if (currentPage === "pets") content.innerHTML = renderPetsPage();
  else if (currentPage === "owners") content.innerHTML = renderOwnersPage();
  else content.innerHTML = renderVaccinationsPage();
}

// Render the active single-page view from the current in-memory records.
function renderDashboard() {
  const due = state.vaccinations.filter(vaccine => vaccineStatus(vaccine).days <= 30);
  const overdueCount = due.filter(vaccine => vaccineStatus(vaccine).days < 0).length;
  const dueSoonCount = due.length - overdueCount;
  const recentPets = [...state.pets].slice(-4).reverse();
  const dueItems = [...due].sort((a, b) => a.nextDue.localeCompare(b.nextDue)).slice(0, 5);
  return `
    <div class="page-heading">
      <div><div class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
      <h1>Good day, pet people <span aria-hidden="true">☀</span></h1><p class="page-subtitle">Here's what's happening with your furry (and feathered) friends.</p></div>
      <button class="button button-primary" data-action="add-pet"><span>＋</span> Add a pet</button>
    </div>
    <div class="stats-grid">
      <article class="stat-card"><div class="stat-top">Total pets <span class="stat-icon">♡</span></div><div class="stat-number">${state.pets.length}</div><div class="stat-caption">In your care</div></article>
      <article class="stat-card"><div class="stat-top">Total owners <span class="stat-icon orange">♧</span></div><div class="stat-number">${state.owners.length}</div><div class="stat-caption">Wonderful humans</div></article>
      <article class="stat-card"><div class="stat-top">Due soon <span class="stat-icon yellow">◷</span></div><div class="stat-number">${dueSoonCount}</div><div class="stat-caption">Vaccines due in 30 days</div></article>
      <article class="stat-card"><div class="stat-top">Overdue <span class="stat-icon orange">✚</span></div><div class="stat-number">${overdueCount}</div><div class="stat-caption">Vaccinations to follow up</div></article>
    </div>
    <div class="content-grid">
      <section class="panel">
        <div class="panel-heading"><h2>Recently added pets</h2><button class="text-link" data-page="pets">View all →</button></div>
        <div class="pet-mini-list">${recentPets.length ? recentPets.map(pet => {
          const owner = ownerFor(pet);
          return `<button class="pet-mini" data-action="view-pet" data-id="${escapeHtml(pet.id)}" style="width:100%;border:0;background:transparent;text-align:left;cursor:pointer">${avatarMarkup(pet)}<span class="pet-mini-info"><strong>${escapeHtml(pet.name)}</strong><span>${escapeHtml(pet.breed)} · ${escapeHtml(owner?.name || "No owner")}</span></span><small>${escapeHtml(pet.species)}</small></button>`;
        }).join("") : emptyState("No pets yet", "Add a pet to start building your records.")}</div>
      </section>
      <section class="panel">
        <div class="panel-heading"><h2>Vaccinations to watch</h2><button class="text-link" data-page="vaccinations">See all →</button></div>
        <div class="vax-list">${dueItems.length ? dueItems.map(vaccine => {
          const pet = petFor(vaccine.petId);
          const status = vaccineStatus(vaccine);
          return `<div class="vax-alert ${status.days < 0 ? "overdue" : ""}"><span class="alert-symbol">✚</span><div><strong>${escapeHtml(vaccine.name)} · ${escapeHtml(pet?.name || "Unknown pet")}</strong><span>${status.days < 0 ? "Was due" : "Due"} ${escapeHtml(formatDate(vaccine.nextDue))}</span></div><time>${status.days < 0 ? `${Math.abs(status.days)}d late` : `${status.days}d`}</time></div>`;
        }).join("") : emptyState("All caught up!", "No vaccinations are due in the next 30 days.")}</div>
      </section>
    </div>`;
}

function renderPetsPage() {
  const pets = filteredPets();
  const speciesList = [...new Set(state.pets.map(pet => pet.species))].sort();
  const breedList = [...new Set(state.pets.map(pet => pet.breed))].sort();
  return `
    <div class="page-heading"><div><div class="eyebrow">Your little companions</div><h1>Pet records</h1><p class="page-subtitle">Every detail that makes them one of a kind.</p></div><button class="button button-primary" data-action="add-pet"><span>＋</span> Add a pet</button></div>
    <div class="toolbar"><div class="filter-row">
      <select class="filter-select" id="speciesFilter" aria-label="Filter by species"><option value="">All species</option>${speciesList.map(item => `<option ${activeSpeciesFilter === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select>
      <select class="filter-select" id="breedFilter" aria-label="Filter by breed"><option value="">All breeds</option>${breedList.map(item => `<option ${activeBreedFilter === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select>
      ${activeOwnerFilter ? `<button class="button button-secondary button-small" data-action="clear-owner-filter">Owner filter ×</button>` : ""}
    </div><span class="result-count">${pets.length} ${pets.length === 1 ? "pet" : "pets"}</span></div>
    <div class="table-wrap"><table><thead><tr><th>Pet</th><th>Breed</th><th>Owner</th><th>Sex</th><th>Birthday</th><th>Actions</th></tr></thead><tbody>
      ${pets.length ? pets.map(pet => `<tr><td><div class="table-pet">${avatarMarkup(pet)}<span>${escapeHtml(pet.name)}</span></div></td><td>${escapeHtml(pet.breed)}</td><td>${escapeHtml(ownerFor(pet)?.name || "—")}</td><td>${escapeHtml(pet.sex)}</td><td>${escapeHtml(formatDate(pet.dob))}</td><td><div class="table-actions"><button class="icon-button" title="View profile" aria-label="View ${escapeHtml(pet.name)} profile" data-action="view-pet" data-id="${escapeHtml(pet.id)}">↗</button><button class="icon-button" title="Edit pet" aria-label="Edit ${escapeHtml(pet.name)}" data-action="edit-pet" data-id="${escapeHtml(pet.id)}">✎</button><button class="icon-button delete" title="Delete pet" aria-label="Delete ${escapeHtml(pet.name)}" data-action="delete-pet" data-id="${escapeHtml(pet.id)}">⌫</button></div></td></tr>`).join("") : `<tr><td colspan="6">${emptyState("No pets found", "Try changing your search or filters.")}</td></tr>`}
    </tbody></table></div>`;
}

function renderOwnersPage() {
  const owners = state.owners.filter(owner => !petSearch || `${owner.name} ${owner.email} ${owner.phone}`.toLowerCase().includes(petSearch.toLowerCase()));
  return `
    <div class="page-heading"><div><div class="eyebrow">The humans behind the paws</div><h1>Pet owners</h1><p class="page-subtitle">Contact details and all the pets they love.</p></div><button class="button button-primary" data-action="add-owner"><span>＋</span> Add an owner</button></div>
    <div class="owner-grid">${owners.length ? owners.map(owner => {
      const petCount = state.pets.filter(pet => pet.ownerId === owner.id).length;
      return `<article class="owner-card"><div class="owner-card-top"><span class="owner-avatar">${escapeHtml(owner.name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase())}</span><div class="table-actions"><button class="icon-button" title="Edit owner" aria-label="Edit ${escapeHtml(owner.name)}" data-action="edit-owner" data-id="${escapeHtml(owner.id)}">✎</button><button class="icon-button delete" title="Delete owner" aria-label="Delete ${escapeHtml(owner.name)}" data-action="delete-owner" data-id="${escapeHtml(owner.id)}">⌫</button></div></div><h3>${escapeHtml(owner.name)}</h3><div class="owner-contact"><span>☎ &nbsp;${escapeHtml(owner.phone)}</span><span>✉ &nbsp;${escapeHtml(owner.email)}</span><span>⌖ &nbsp;${escapeHtml(owner.address)}</span></div><div class="owner-card-footer"><span>${petCount} ${petCount === 1 ? "pet" : "pets"}</span><button class="text-link" data-action="owner-pets" data-id="${escapeHtml(owner.id)}">View pets →</button></div></article>`;
    }).join("") : `<div class="panel">${emptyState("No owners found", "Add an owner or try another search.")}</div>`}</div>`;
}

function renderVaccinationsPage() {
  const items = state.vaccinations.map(vaccine => ({ vaccine, pet: petFor(vaccine.petId), status: vaccineStatus(vaccine) }))
    .filter(item => item.pet && (!petSearch || `${item.vaccine.name} ${item.pet.name} ${ownerFor(item.pet)?.name || ""}`.toLowerCase().includes(petSearch.toLowerCase())))
    .sort((a, b) => a.vaccine.nextDue.localeCompare(b.vaccine.nextDue));
  const counts = {
    overdue: items.filter(item => item.status.label === "Overdue").length,
    soon: items.filter(item => item.status.label === "Due soon").length,
    current: items.filter(item => item.status.label === "Up to date").length
  };
  return `
    <div class="page-heading"><div><div class="eyebrow">A healthy pet is a happy pet</div><h1>Vaccination records</h1><p class="page-subtitle">Stay one step ahead of every booster and checkup.</p></div><button class="button button-primary" data-action="add-vaccination"><span>＋</span> Add vaccination</button></div>
    <div class="vaccination-summary"><span class="summary-chip">Overdue <strong>${counts.overdue}</strong></span><span class="summary-chip">Due soon <strong>${counts.soon}</strong></span><span class="summary-chip">Up to date <strong>${counts.current}</strong></span></div>
    <div class="table-wrap"><table><thead><tr><th>Vaccine</th><th>Pet</th><th>Date given</th><th>Next due</th><th>Veterinarian</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${items.length ? items.map(({ vaccine, pet, status }) => `<tr><td><strong>${escapeHtml(vaccine.name)}</strong></td><td><button class="text-link" data-action="view-pet" data-id="${escapeHtml(pet.id)}">${escapeHtml(pet.name)}</button></td><td>${escapeHtml(formatDate(vaccine.dateGiven))}</td><td>${escapeHtml(formatDate(vaccine.nextDue))}</td><td>${escapeHtml(vaccine.veterinarian)}</td><td><span class="status ${status.className}">${status.label}</span></td><td><button class="icon-button delete" title="Delete vaccination" aria-label="Delete ${escapeHtml(vaccine.name)} vaccination" data-action="delete-vaccination" data-id="${escapeHtml(vaccine.id)}">⌫</button></td></tr>`).join("") : `<tr><td colspan="7">${emptyState("No vaccinations found", "Add a vaccination record for one of your pets.")}</td></tr>`}
    </tbody></table></div>`;
}

function emptyState(title, message) {
  return `<div class="empty-state"><span class="empty-icon">♡</span><strong>${escapeHtml(title)}</strong><br>${escapeHtml(message)}</div>`;
}

function showToast(message) {
  const region = document.getElementById("toastRegion");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  region.append(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showModal(content, wide = false) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-backdrop" data-action="backdrop-close"><section class="modal ${wide ? "modal-wide" : ""}" role="dialog" aria-modal="true">${content}</section></div>`;
  root.querySelector(".modal").addEventListener("click", event => event.stopPropagation());
  root.querySelector(".modal-backdrop").addEventListener("click", event => {
    if (event.target === event.currentTarget) closeModal();
  });
  root.querySelector("input, select, button")?.focus();
}

function closeModal() {
  document.getElementById("modalRoot").innerHTML = "";
}

// Form dialogs keep record entry focused while reusing the same page shell.
function openPetForm(pet = null) {
  if (!pet && state.owners.length === 0) {
    showToast("Add an owner before creating a pet record.");
    openOwnerForm();
    return;
  }
  const current = pet || { name: "", species: "Dog", breed: "", sex: "", dob: "", color: "", weight: "", ownerId: state.owners[0]?.id || "", photo: "" };
  const breedsForSpecies = breeds[current.species] || [];
  showModal(`
    <div class="modal-heading"><div><h2>${pet ? "Edit pet record" : "Add a pet"}</h2><p>${pet ? "Update your companion's information." : "Let's get to know your new friend."}</p></div><button class="close-button" type="button" data-action="close-modal" aria-label="Close">×</button></div>
    <form id="petForm" data-id="${escapeHtml(pet?.id || "")}">
      <div class="form-grid">
        <div class="form-field"><label for="petName">Pet name *</label><input class="form-control" id="petName" name="name" required maxlength="60" value="${escapeHtml(current.name)}" placeholder="e.g. Biscuit"></div>
        <div class="form-field"><label for="petSpecies">Species *</label><select class="form-control" id="petSpecies" name="species" required>${["Dog", "Cat", "Bird", "Rabbit", "Other"].map(species => `<option ${current.species === species ? "selected" : ""}>${species}</option>`).join("")}</select></div>
        <div class="form-field"><label for="petBreed">Breed *</label><div class="breed-add-row"><select class="form-control" id="petBreed" name="breed" required>${breedsForSpecies.map(breed => `<option ${current.breed === breed ? "selected" : ""}>${escapeHtml(breed)}</option>`).join("")}${current.breed && !breedsForSpecies.includes(current.breed) ? `<option selected>${escapeHtml(current.breed)}</option>` : ""}</select><button class="button button-secondary button-small" type="button" data-action="add-breed" title="Add a new breed">＋</button></div></div>
        <div class="form-field"><label for="petSex">Sex *</label><select class="form-control" id="petSex" name="sex" required><option value="">Select sex</option>${["Female", "Male", "Unknown"].map(sex => `<option ${current.sex === sex ? "selected" : ""}>${sex}</option>`).join("")}</select></div>
        <div class="form-field"><label for="petDob">Date of birth *</label><input class="form-control" id="petDob" name="dob" type="date" required max="${new Date().toISOString().slice(0, 10)}" value="${escapeHtml(current.dob)}"></div>
        <div class="form-field"><label for="petWeight">Weight (kg) *</label><input class="form-control" id="petWeight" name="weight" type="number" min="0.01" max="9999" step="0.01" required value="${escapeHtml(current.weight)}" placeholder="e.g. 12.5"></div>
        <div class="form-field"><label for="petColor">Color *</label><input class="form-control" id="petColor" name="color" required maxlength="50" value="${escapeHtml(current.color)}" placeholder="e.g. Honey gold"></div>
        <div class="form-field"><label for="petOwner">Owner *</label><select class="form-control" id="petOwner" name="ownerId" required>${ownerOptions(current.ownerId)}</select></div>
        <div class="form-field full"><label for="petPhoto">Photo <span class="optional">(optional)</span></label><input class="form-control" id="petPhoto" name="photo" type="file" accept="image/*"><span class="form-hint">${current.photo ? "A photo is saved. Choose another image to replace it." : "Choose an image from this device (up to 2 MB)."}</span></div>
      </div>
      <div class="form-actions"><button class="button button-secondary" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">${pet ? "Save changes" : "Add pet"}</button></div>
    </form>`, false);
}

function openOwnerForm(owner = null) {
  const current = owner || { name: "", phone: "", email: "", address: "" };
  showModal(`
    <div class="modal-heading"><div><h2>${owner ? "Edit owner" : "Add an owner"}</h2><p>Keep their contact details handy.</p></div><button class="close-button" type="button" data-action="close-modal" aria-label="Close">×</button></div>
    <form id="ownerForm" data-id="${escapeHtml(owner?.id || "")}"><div class="form-grid">
      <div class="form-field full"><label for="ownerName">Full name *</label><input class="form-control" id="ownerName" name="name" required maxlength="80" value="${escapeHtml(current.name)}"></div>
      <div class="form-field"><label for="ownerPhone">Contact number *</label><input class="form-control" id="ownerPhone" name="phone" type="tel" required maxlength="30" value="${escapeHtml(current.phone)}"></div>
      <div class="form-field"><label for="ownerEmail">Email address *</label><input class="form-control" id="ownerEmail" name="email" type="email" required maxlength="120" value="${escapeHtml(current.email)}"></div>
      <div class="form-field full"><label for="ownerAddress">Address *</label><textarea class="form-control" id="ownerAddress" name="address" required maxlength="200">${escapeHtml(current.address)}</textarea></div>
    </div><div class="form-actions"><button class="button button-secondary" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">${owner ? "Save changes" : "Add owner"}</button></div></form>`);
}

function openVaccinationForm(petId = "") {
  if (!state.pets.length) {
    showToast("Add a pet before recording a vaccination.");
    return;
  }
  showModal(`
    <div class="modal-heading"><div><h2>Add vaccination</h2><p>Record a vaccine or booster for a pet.</p></div><button class="close-button" type="button" data-action="close-modal" aria-label="Close">×</button></div>
    <form id="vaccinationForm"><div class="form-grid">
      <div class="form-field"><label for="vaxPet">Pet *</label><select class="form-control" id="vaxPet" name="petId" required>${state.pets.map(pet => `<option value="${escapeHtml(pet.id)}" ${pet.id === petId ? "selected" : ""}>${escapeHtml(pet.name)} · ${escapeHtml(pet.species)}</option>`).join("")}</select></div>
      <div class="form-field"><label for="vaxName">Vaccine name *</label><input class="form-control" id="vaxName" name="name" required maxlength="80" placeholder="e.g. Rabies"></div>
      <div class="form-field"><label for="dateGiven">Date given *</label><input class="form-control" id="dateGiven" name="dateGiven" type="date" required max="${new Date().toISOString().slice(0, 10)}"></div>
      <div class="form-field"><label for="nextDue">Next due date *</label><input class="form-control" id="nextDue" name="nextDue" type="date" required></div>
      <div class="form-field full"><label for="vaxVet">Veterinarian name *</label><input class="form-control" id="vaxVet" name="veterinarian" required maxlength="80" placeholder="e.g. Dr. Harper"></div>
      <div class="form-field full"><label for="vaxNotes">Notes <span class="optional">(optional)</span></label><textarea class="form-control" id="vaxNotes" name="notes" maxlength="500" placeholder="Anything to remember about this visit?"></textarea></div>
    </div><div class="form-actions"><button class="button button-secondary" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">Save vaccination</button></div></form>`);
}

function openPetProfile(pet) {
  const owner = ownerFor(pet);
  const vaccinations = state.vaccinations.filter(vaccine => vaccine.petId === pet.id).sort((a, b) => b.dateGiven.localeCompare(a.dateGiven));
  showModal(`
    <div class="modal-heading"><div><div class="eyebrow">Pet profile</div><p>Record ID · ${escapeHtml(pet.id)}</p></div><button class="close-button" type="button" data-action="close-modal" aria-label="Close">×</button></div>
    <div class="profile-header">${avatarMarkup(pet, "profile-photo")}<div><h2>${escapeHtml(pet.name)}</h2><p>${escapeHtml(pet.breed)} · ${escapeHtml(pet.species)}</p></div><button class="button button-secondary button-small" data-action="edit-pet" data-id="${escapeHtml(pet.id)}">Edit</button></div>
    <div class="detail-grid">
      ${detail("Sex", pet.sex)}${detail("Date of birth", formatDate(pet.dob))}${detail("Color", pet.color)}
      ${detail("Weight", `${pet.weight} kg`)}${detail("Pet ID", pet.id)}${detail("Age", petAge(pet.dob))}
    </div>
    <section class="profile-section"><h3>Owner</h3>${owner ? `<div class="owner-detail"><h4>${escapeHtml(owner.name)}</h4><p>☎ &nbsp;${escapeHtml(owner.phone)}</p><p>✉ &nbsp;${escapeHtml(owner.email)}</p><p>⌖ &nbsp;${escapeHtml(owner.address)}</p><button class="text-link section-spacer" data-action="owner-pets" data-id="${escapeHtml(owner.id)}">View all their pets →</button></div>` : emptyState("Owner not found", "Assign this pet to an owner to see their details.")}</section>
    <section class="profile-section"><div class="panel-heading"><h3>Vaccination history</h3><button class="button button-primary button-small" data-action="add-vaccination" data-id="${escapeHtml(pet.id)}">＋ Add vaccine</button></div>
      ${vaccinations.length ? `<div class="table-wrap"><table><thead><tr><th>Vaccine</th><th>Date given</th><th>Next due</th><th>Veterinarian</th><th>Status</th></tr></thead><tbody>${vaccinations.map(vaccine => {
        const status = vaccineStatus(vaccine);
        return `<tr><td>${escapeHtml(vaccine.name)}${vaccine.notes ? `<div class="form-hint">${escapeHtml(vaccine.notes)}</div>` : ""}</td><td>${escapeHtml(formatDate(vaccine.dateGiven))}</td><td>${escapeHtml(formatDate(vaccine.nextDue))}</td><td>${escapeHtml(vaccine.veterinarian)}</td><td><span class="status ${status.className}">${status.label}</span></td></tr>`;
      }).join("")}</tbody></table></div>` : emptyState("No vaccinations yet", "Add a vaccine to start this pet's health history.")}</section>`, true);
}

function detail(label, value) {
  return `<div class="detail-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "—")}</strong></div>`;
}

function petAge(dob) {
  const birth = new Date(`${dob}T00:00:00`);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years > 0) return `${years} ${years === 1 ? "year" : "years"}${months ? `, ${months} mo` : ""}`;
  return `${Math.max(0, months)} mo`;
}

function addBreed() {
  const species = document.getElementById("petSpecies").value;
  const name = prompt(`Add a breed for ${species}:`);
  if (!name || !name.trim()) return;
  const breed = name.trim();
  breeds[species] ||= [];
  if (breeds[species].some(item => item.toLowerCase() === breed.toLowerCase())) {
    showToast("That breed is already in the list.");
    return;
  }
  breeds[species].push(breed);
  breeds[species].sort((a, b) => a.localeCompare(b));
  persistBreeds();
  const selector = document.getElementById("petBreed");
  selector.innerHTML = breeds[species].map(item => `<option ${item === breed ? "selected" : ""}>${escapeHtml(item)}</option>`).join("");
  selector.value = breed;
  showToast(`${breed} added to ${species} breeds.`);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Validate form values before creating or replacing records.
async function handlePetSubmit(form) {
  if (!form.reportValidity()) return;
  const formData = new FormData(form);
  const photoFile = formData.get("photo");
  let photo = form.dataset.id ? petFor(form.dataset.id)?.photo || "" : "";
  if (photoFile instanceof File && photoFile.size > 0) {
    if (!photoFile.type.startsWith("image/")) {
      document.getElementById("petPhoto").setCustomValidity("Choose a valid image file.");
      document.getElementById("petPhoto").reportValidity();
      return;
    }
    if (photoFile.size > 2 * 1024 * 1024) {
      document.getElementById("petPhoto").setCustomValidity("Photo must be 2 MB or smaller.");
      document.getElementById("petPhoto").reportValidity();
      return;
    }
    photo = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("The selected pet photo could not be read."));
      reader.readAsDataURL(photoFile);
    });
  }
  const pet = {
    id: form.dataset.id || makeId("pet"),
    name: formData.get("name").trim(),
    species: formData.get("species"),
    breed: formData.get("breed"),
    sex: formData.get("sex"),
    dob: formData.get("dob"),
    color: formData.get("color").trim(),
    weight: Number(formData.get("weight")),
    ownerId: formData.get("ownerId"),
    photo,
    createdAt: form.dataset.id ? petFor(form.dataset.id).createdAt : new Date().toISOString().slice(0, 10)
  };
  if (pet.dob > new Date().toISOString().slice(0, 10) || !Number.isFinite(pet.weight) || pet.weight <= 0) {
    showToast("Check the date of birth and weight, then try again.");
    return;
  }
  const index = state.pets.findIndex(item => item.id === pet.id);
  if (index >= 0) state.pets[index] = pet;
  else state.pets.push(pet);
  persist();
  closeModal();
  renderPage();
  showToast(index >= 0 ? "Pet record updated." : "Pet added to your records.");
}

function handleOwnerSubmit(form) {
  if (!form.reportValidity()) return;
  const formData = new FormData(form);
  const owner = {
    id: form.dataset.id || makeId("owner"),
    name: formData.get("name").trim(),
    phone: formData.get("phone").trim(),
    email: formData.get("email").trim(),
    address: formData.get("address").trim()
  };
  const emailInput = document.getElementById("ownerEmail");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email)) {
    emailInput.setCustomValidity("Enter a valid email address.");
    emailInput.reportValidity();
    return;
  }
  const index = state.owners.findIndex(item => item.id === owner.id);
  if (index >= 0) state.owners[index] = owner;
  else state.owners.push(owner);
  persist();
  closeModal();
  renderPage();
  showToast(index >= 0 ? "Owner details updated." : "Owner added.");
}

function handleVaccinationSubmit(form) {
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const dateGiven = data.get("dateGiven");
  const nextDue = data.get("nextDue");
  if (nextDue < dateGiven || dateGiven > new Date().toISOString().slice(0, 10)) {
    showToast("The next due date must be on or after the date given, and date given cannot be in the future.");
    return;
  }
  state.vaccinations.push({
    id: makeId("vax"),
    petId: data.get("petId"),
    name: data.get("name").trim(),
    dateGiven,
    nextDue,
    veterinarian: data.get("veterinarian").trim(),
    notes: data.get("notes").trim()
  });
  persist();
  closeModal();
  renderPage();
  showToast("Vaccination record saved.");
}

function deletePet(id) {
  const pet = petFor(id);
  if (!pet || !confirm(`Delete ${pet.name}'s record? This will also delete their vaccination history.`)) return;
  state.pets = state.pets.filter(item => item.id !== id);
  state.vaccinations = state.vaccinations.filter(vaccine => vaccine.petId !== id);
  persist();
  renderPage();
  showToast("Pet and associated vaccinations deleted.");
}

function deleteOwner(id) {
  const owner = state.owners.find(item => item.id === id);
  if (!owner) return;
  const pets = state.pets.filter(pet => pet.ownerId === id);
  if (pets.length) {
    showToast("Reassign or delete this owner's pets before deleting the owner.");
    return;
  }
  if (!confirm(`Delete ${owner.name}'s owner record?`)) return;
  state.owners = state.owners.filter(item => item.id !== id);
  persist();
  renderPage();
  showToast("Owner deleted.");
}

function deleteVaccination(id) {
  const vaccine = state.vaccinations.find(item => item.id === id);
  if (!vaccine || !confirm(`Delete the ${vaccine.name} vaccination record?`)) return;
  state.vaccinations = state.vaccinations.filter(item => item.id !== id);
  persist();
  renderPage();
  showToast("Vaccination record deleted.");
}

document.addEventListener("click", event => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) {
    event.preventDefault();
    setPage(pageButton.dataset.page);
    return;
  }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const { action, id } = actionButton.dataset;
  if (action === "add-pet") openPetForm();
  else if (action === "edit-pet") {
    const pet = petFor(id);
    if (pet) openPetForm(pet);
  } else if (action === "view-pet") {
    const pet = petFor(id);
    if (pet) openPetProfile(pet);
  } else if (action === "delete-pet") deletePet(id);
  else if (action === "add-owner") openOwnerForm();
  else if (action === "edit-owner") {
    const owner = state.owners.find(item => item.id === id);
    if (owner) openOwnerForm(owner);
  } else if (action === "delete-owner") deleteOwner(id);
  else if (action === "owner-pets") {
    activeOwnerFilter = id;
    activeBreedFilter = "";
    activeSpeciesFilter = "";
    setPage("pets");
  } else if (action === "clear-owner-filter") {
    activeOwnerFilter = "";
    renderPage();
  } else if (action === "add-vaccination") openVaccinationForm(id || "");
  else if (action === "delete-vaccination") deleteVaccination(id);
  else if (action === "add-breed") addBreed();
  else if (action === "close-modal") closeModal();
});

document.addEventListener("submit", event => {
  if (event.target.id === "petForm") {
    event.preventDefault();
    handlePetSubmit(event.target).catch(error => {
      console.error("Unable to save pet photo.", error);
      showToast("The photo could not be saved. Please try another image.");
    });
  } else if (event.target.id === "ownerForm") {
    event.preventDefault();
    handleOwnerSubmit(event.target);
  } else if (event.target.id === "vaccinationForm") {
    event.preventDefault();
    handleVaccinationSubmit(event.target);
  }
});

document.addEventListener("input", event => {
  if (event.target.id === "globalSearch") {
    petSearch = event.target.value.trim();
    renderPage();
  }
  if (event.target.id === "ownerEmail") event.target.setCustomValidity("");
  if (event.target.id === "petPhoto") event.target.setCustomValidity("");
});

document.addEventListener("change", event => {
  if (event.target.id === "speciesFilter") {
    activeSpeciesFilter = event.target.value;
    activeBreedFilter = "";
    renderPage();
  } else if (event.target.id === "breedFilter") {
    activeBreedFilter = event.target.value;
    renderPage();
  } else if (event.target.id === "petSpecies") {
    const selector = document.getElementById("petBreed");
    selector.innerHTML = (breeds[event.target.value] || []).map(breed => `<option>${escapeHtml(breed)}</option>`).join("");
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    document.getElementById("globalSearch").focus();
  }
});

renderPage();
