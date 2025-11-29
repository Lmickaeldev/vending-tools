let items = [];

// Charge items.json (noms + images)
async function loadItems() {
  try {
    const res = await fetch("items.json");
    if (!res.ok) {
      throw new Error("Erreur items.json : " + res.status);
    }
    items = await res.json();
  } catch (err) {
    console.error(err);
    document.getElementById("status").textContent =
      "Erreur de chargement de items.json : " + err.message;
  }
}

// Génère le texte à copier pour une machine (format pensé pour IG)
function machineToClipboardText(machine, findItem) {
  const lines = [];

  lines.push(`VENDING : ${machine.name || machine.id}`);
  if (machine.location) lines.push(`Lieu : ${machine.location}`);
  if (machine.notes) lines.push(`Notes : ${machine.notes}`);
  lines.push("");
  lines.push("Offres :");
  lines.push("(Ouvre la vending, ajoute chaque ligne dans un slot)");

  (machine.offers || []).forEach((offer, index) => {
    const item = findItem(offer.shortName);
    const curr = findItem(offer.currencyShortName);

    const itemLabel = item ? item.displayName : offer.shortName;
    const currLabel = curr ? curr.displayName : offer.currencyShortName;

    lines.push(
      `${index + 1}. ${offer.quantity}x ${itemLabel} (${offer.shortName}) ` +
        `→ ${offer.price} ${currLabel} (${offer.currencyShortName})`
    );
  });

  return lines.join("\n");
}

// Rend l'affichage à partir d'une config JSON
function renderConfig(config) {
  const status = document.getElementById("status");
  const container = document.getElementById("machines-container");

  container.innerHTML = "";

  if (!config || !Array.isArray(config.machines)) {
    status.textContent = "Fichier invalide : pas de propriété 'machines'.";
    return;
  }

  status.textContent =
    `Config chargée : version ${config.version ?? "?"}, ` +
    `${config.machines.length} machine(s).`;

  if (config.machines.length === 0) {
    container.innerHTML = "<div class='small'>Aucune vending machine.</div>";
    return;
  }

  function findItem(shortName) {
    return items.find((i) => i.shortName === shortName);
  }

  config.machines.forEach((machine) => {
    const div = document.createElement("div");
    div.className = "machine";

    const header = document.createElement("div");
    header.className = "machine-header";

    const left = document.createElement("div");
    left.innerHTML = `
      <div class="machine-name">${machine.name || machine.id}</div>
      <div class="machine-location">${machine.location || ""}</div>
    `;

    const right = document.createElement("div");
    right.className = "header-right";

    const idSpan = document.createElement("span");
    idSpan.className = "small";
    idSpan.textContent = "ID: " + machine.id;

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "📋 Copier pour IG";
    copyBtn.className = "copy-button";

    copyBtn.addEventListener("click", async () => {
      const text = machineToClipboardText(machine, findItem);
      try {
        await navigator.clipboard.writeText(text);
        alert(
          "Configuration copiée dans le presse-papier ✅\nColle-la dans un bloc-notes ou Discord pour la suivre en jeu."
        );
      } catch (err) {
        console.error(err);
        alert(
          "Impossible de copier dans le presse-papier (navigateur / permissions)."
        );
      }
    });

    right.appendChild(idSpan);
    right.appendChild(copyBtn);

    header.appendChild(left);
    header.appendChild(right);

    div.appendChild(header);

    if (machine.notes) {
      const notes = document.createElement("div");
      notes.innerHTML = `<span class="small">${machine.notes}</span>`;
      div.appendChild(notes);
    }

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Item vendu</th>
          <th>Quantité</th>
          <th>Prix</th>
          <th>Monnaie</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    (machine.offers || []).forEach((offer) => {
      const tr = document.createElement("tr");

      const item = findItem(offer.shortName);
      const currency = findItem(offer.currencyShortName);

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

      // Prix
      const tdPrice = document.createElement("td");
      tdPrice.textContent = offer.price;

      // Monnaie
      const tdCurr = document.createElement("td");
      if (currency) {
        tdCurr.innerHTML = `
          <div class="item-preview">
            <img src="${currency.image}" alt="${currency.displayName}">
            <span>
              ${currency.displayName}<br>
              <span class="small">${currency.shortName}</span>
            </span>
          </div>
        `;
      } else {
        tdCurr.textContent = offer.currencyShortName;
      }

      tr.appendChild(tdItem);
      tr.appendChild(tdQty);
      tr.appendChild(tdPrice);
      tr.appendChild(tdCurr);

      tbody.appendChild(tr);
    });

    div.appendChild(table);
    container.appendChild(div);
  });
}

// Gestion de l'input fichier (import de vending.json)
function setupFileInput() {
  const input = document.getElementById("file-input");
  const status = document.getElementById("status");
  const container = document.getElementById("machines-container");

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    status.textContent = "Lecture du fichier " + file.name + "…";
    container.innerHTML = "";

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const json = JSON.parse(text);
        renderConfig(json);
      } catch (err) {
        console.error(err);
        status.textContent = "Erreur de parsing JSON : " + err.message;
      }
    };
    reader.onerror = () => {
      status.textContent = "Erreur de lecture du fichier.";
    };

    reader.readAsText(file, "utf-8");
  });
}

// Init
window.addEventListener("DOMContentLoaded", async () => {
  await loadItems();
  setupFileInput();
});
