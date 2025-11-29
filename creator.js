let items = [];
let vendingConfig = { version: 1, machines: [] };
let activeMachineId = null;

// ---------- Sauvegarde locale ----------

function saveConfigToLocalStorage() {
  try {
    localStorage.setItem("vendingConfig", JSON.stringify(vendingConfig));
  } catch (e) {
    console.error("Erreur sauvegarde localStorage :", e);
  }
}

// ---------- Chargement des données ----------

async function loadData() {
  try {
    // 1) Items Rust
    const itemsRes = await fetch("items.json");
    if (!itemsRes.ok) throw new Error("Erreur items.json : " + itemsRes.status);

    items = await itemsRes.json();
    items.sort((a, b) => a.displayName.localeCompare(b.displayName));

    // 2) Config vending : d'abord localStorage, sinon vending.json, sinon valeur par défaut
    const stored = localStorage.getItem("vendingConfig");
    if (stored) {
      vendingConfig = JSON.parse(stored);
    } else {
      try {
        const vendingRes = await fetch("vending.json");
        if (vendingRes.ok) {
          vendingConfig = await vendingRes.json();
        } else {
          vendingConfig = { version: 1, machines: [] };
        }
      } catch {
        vendingConfig = { version: 1, machines: [] };
      }
    }

    initItemSelect();
    initCurrencySelect();
    renderMachineSelect();

    if (vendingConfig.machines.length === 0) {
      createNewMachine();
    } else {
      setActiveMachine(vendingConfig.machines[0].id);
    }
  } catch (err) {
    console.error("Erreur loadData:", err);
    alert("Erreur de chargement des données (voir console).");
  }
}

// ---------- Select des items vendus ----------

function initItemSelect() {
  const itemSelect = document.getElementById("item-select");
  itemSelect.innerHTML = "";

  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.shortName;
    opt.textContent = item.displayName;
    itemSelect.appendChild(opt);
  });
}

// ---------- Select de la monnaie + preview ----------

function initCurrencySelect() {
  const currencySelect = document.getElementById("currency-select");
  const preview = document.getElementById("currency-preview");

  currencySelect.innerHTML = "";

  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.shortName;
    opt.textContent = item.displayName;
    currencySelect.appendChild(opt);
  });

  currencySelect.addEventListener("change", () => {
    const shortName = currencySelect.value;
    const item = items.find((i) => i.shortName === shortName);
    if (!item) {
      preview.innerHTML = "";
      return;
    }

    preview.innerHTML = `
      <div class="item-preview">
        <img src="${item.image}" alt="${item.displayName}">
        <span>
          ${item.displayName}<br>
          <span class="small">${item.shortName}</span>
        </span>
      </div>
    `;
  });

  if (currencySelect.options.length > 0) {
    currencySelect.selectedIndex = 0;
    currencySelect.dispatchEvent(new Event("change"));
  }
}

// ---------- Machines ----------

function renderMachineSelect() {
  const select = document.getElementById("machine-select");
  select.innerHTML = "";

  vendingConfig.machines.forEach((machine) => {
    const opt = document.createElement("option");
    opt.value = machine.id;
    opt.textContent = machine.name || machine.id;
    select.appendChild(opt);
  });

  select.onchange = () => {
    setActiveMachine(select.value);
  };

  if (activeMachineId) {
    select.value = activeMachineId;
  }
}

function setActiveMachine(id) {
  activeMachineId = id;
  const machine = vendingConfig.machines.find((m) => m.id === id);
  if (!machine) return;

  document.getElementById("machine-name").value = machine.name || "";
  document.getElementById("machine-location").value = machine.location || "";
  document.getElementById("machine-notes").value = machine.notes || "";

  renderOffersTable(machine);
}

function createNewMachine() {
  const id = "vm-" + Date.now();
  const machine = {
    id,
    name: "Nouvelle machine",
    location: "",
    notes: "",
    offers: [],
  };

  vendingConfig.machines.push(machine);
  activeMachineId = id;
  renderMachineSelect();
  setActiveMachine(id);
  saveConfigToLocalStorage();
}

function deleteActiveMachine() {
  if (!activeMachineId) return;
  if (!confirm("Supprimer cette vending machine ?")) return;

  vendingConfig.machines = vendingConfig.machines.filter(
    (m) => m.id !== activeMachineId
  );

  if (vendingConfig.machines.length > 0) {
    activeMachineId = vendingConfig.machines[0].id;
  } else {
    activeMachineId = null;
  }

  renderMachineSelect();

  if (activeMachineId) {
    setActiveMachine(activeMachineId);
  } else {
    document.getElementById("machine-name").value = "";
    document.getElementById("machine-location").value = "";
    document.getElementById("machine-notes").value = "";
    document.querySelector("#offers-table tbody").innerHTML = "";
  }

  saveConfigToLocalStorage();
}

function saveActiveMachine() {
  if (!activeMachineId) return;
  const machine = vendingConfig.machines.find((m) => m.id === activeMachineId);
  if (!machine) return;

  machine.name = document.getElementById("machine-name").value.trim();
  machine.location = document.getElementById("machine-location").value.trim();
  machine.notes = document.getElementById("machine-notes").value.trim();

  renderMachineSelect();
  saveConfigToLocalStorage();
}

// ---------- Offres ----------

function addOfferToActiveMachine() {
  if (!activeMachineId) return;
  const machine = vendingConfig.machines.find((m) => m.id === activeMachineId);
  if (!machine) return;

  const itemSelect = document.getElementById("item-select");
  const shortName = itemSelect.value;
  const quantity =
    parseInt(document.getElementById("offer-quantity").value, 10) || 1;
  const price = parseInt(document.getElementById("offer-price").value, 10) || 0;
  const currencyShortName = document.getElementById("currency-select").value;

  const offer = {
    shortName,
    quantity,
    price,
    currencyShortName,
  };

  machine.offers.push(offer);
  renderOffersTable(machine);
  saveConfigToLocalStorage();
}

function removeOffer(machineId, index) {
  const machine = vendingConfig.machines.find((m) => m.id === machineId);
  if (!machine) return;

  machine.offers.splice(index, 1);
  renderOffersTable(machine);
  saveConfigToLocalStorage();
}

// ---------- Tableau des offres ----------

function renderOffersTable(machine) {
  const tbody = document.querySelector("#offers-table tbody");
  tbody.innerHTML = "";

  machine.offers.forEach((offer, index) => {
    const item = items.find((i) => i.shortName === offer.shortName);
    const currItem = items.find((i) => i.shortName === offer.currencyShortName);

    const tr = document.createElement("tr");

    // Item vendu
    const tdItem = document.createElement("td");
    if (item) {
      tdItem.innerHTML = `
        <div class="item-preview">
          <img src="${item.image}" alt="${item.displayName}">
          <span>
            ${item.displayName}<br>
            <span class="small">${item.shortName}</span>
          </span>
        </div>
      `;
    } else {
      tdItem.textContent = offer.shortName;
    }

    // Quantité
    const tdQty = document.createElement("td");
    tdQty.textContent = offer.quantity;

    // Prix (nombre de monnaie)
    const tdPrice = document.createElement("td");
    tdPrice.textContent = offer.price;

    // Monnaie (avec image)
    const tdCurr = document.createElement("td");
    if (currItem) {
      tdCurr.innerHTML = `
        <div class="item-preview">
          <img src="${currItem.image}" alt="${currItem.displayName}">
          <span>
            ${currItem.displayName}<br>
            <span class="small">${currItem.shortName}</span>
          </span>
        </div>
      `;
    } else {
      tdCurr.textContent = offer.currencyShortName;
    }

    // Bouton supprimer
    const tdActions = document.createElement("td");
    const btnDel = document.createElement("button");
    btnDel.textContent = "✖";
    btnDel.onclick = () => removeOffer(machine.id, index);
    tdActions.appendChild(btnDel);

    tr.appendChild(tdItem);
    tr.appendChild(tdQty);
    tr.appendChild(tdPrice);
    tr.appendChild(tdCurr);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

// ---------- Export ----------

function exportVendingJson() {
  const dataStr = JSON.stringify(vendingConfig, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "vending.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function exportVendingJs() {
  const jsContent =
    "window.vendingConfig = " + JSON.stringify(vendingConfig, null, 2) + ";\n";

  const blob = new Blob([jsContent], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "vending-config.js";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

// ---------- Init ----------

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-add-machine").onclick = createNewMachine;
  document.getElementById("btn-delete-machine").onclick = deleteActiveMachine;
  document.getElementById("btn-save-machine").onclick = saveActiveMachine;
  document.getElementById("btn-add-offer").onclick = addOfferToActiveMachine;
  document.getElementById("btn-export-json").onclick = exportVendingJson;
  document.getElementById("btn-export-js").onclick = exportVendingJs;

  loadData();
});
