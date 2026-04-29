const PROJECT = {
  initialCenter: [43.7630, -79.23697],
  initialZoom: 12,
  minZoom: 10,
  tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  tileOptions: {
    maxZoom: 19,
    minZoom: 10,
    attribution: "&copy; OpenStreetMap contributors | Data: SEA",
  },
  panes: [
    { name: "basePolys", zIndex: 250 },
    { name: "points", zIndex: 450 },
  ],
  suggestionsUrl:
    "https://forms.gle/gVPp7GbBEShNVCXP9",
};

const map = L.map("map", {
  center: PROJECT.initialCenter,
  zoom: PROJECT.initialZoom,
  minZoom: PROJECT.minZoom,
});

PROJECT.panes.forEach(({ name, zIndex }) => {
  map.createPane(name);
  map.getPane(name).style.zIndex = zIndex;
});

L.tileLayer(PROJECT.tileUrl, PROJECT.tileOptions).addTo(map);

const overlayLayers = {};

let salesFilter = "ALL";
let salesTypes = [];
let salesGeojson = null;
let salesLayer = null;

const ICON_HTML_CACHE = {};

const LAYER_CONFIGS = [
  {
    id: "sales",
    name: "Garage Sales",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTeCJITAJavcP6-EBf20zK9pbW2WciXT1cSf2gh_rz771aB0KQehpceD-jeEF04DhXIIypE5M7AH_pr/pub?gid=381244535&single=true&output=csv&t=" + Date.now(),
    defaultVisible: true,
    pane: "points",
    pointToLayer: (feature, latlng, cfg) => {
      const props = feature.properties || {};

      const iconKey = isGarageSaleDay(props)
        ? "garage_sale_day"
        : props.timing_category;

      return L.marker(latlng, {
        icon: makeSaleDivIcon(iconKey),
        pane: cfg.pane,
  });
},
    popupBuilder: buildSalesPopupHTML,
    legend: {
      type: "note",
      text: "Tap a point to view sale details.",
    },
  },
  {
    id: "scarborough_bdry",
    name: "Scarborough boundary",
    url: "data/scarborough_bdry.geojson",
    defaultVisible: true,
    pane: "basePolys",
    style: () => ({
      color: "#111",
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0,
      dashArray: "6 6",
    }),
  },
];

function esc(value) {
  if (value == null) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanValue(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || s.toLowerCase() === "none") return null;
  return s;
}

function rowHTML(label, contentHtml) {
  return `
    <div class="sea-row">
      <div class="sea-label">${label}</div>
      <div class="sea-value">${contentHtml}</div>
    </div>
  `;
}

function makeSaleDivIcon(iconKeyRaw) {
  const key = String(iconKeyRaw || "future_week")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (!ICON_HTML_CACHE[key]) {
    ICON_HTML_CACHE[key] = `<img src="icons/${key}.png" class="store-icon-img" alt="">`;
  }

  const isSpecial = key === "garage_sale_day";

  const size = isSpecial ? 45 : 34;
  const anchor = size / 2;

  return L.divIcon({
    className: "store-divicon",
    html: ICON_HTML_CACHE[key],
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    popupAnchor: [0, -anchor],
  });
}

function formatAddressHTML(addressRaw) {
  if (!addressRaw) return "";

  const text = String(addressRaw).replace(/\r/g, "").trim();

  const parts = text.includes("\n")
    ? text.split("\n").map((part) => part.trim()).filter(Boolean)
    : text.split(",").map((part) => part.trim()).filter(Boolean);

  if (!parts.length) return "";

  const lastPart = parts[parts.length - 1] || "";
  const match = lastPart.match(/^([A-Za-z]{2})\s+(.+)$/);

  const province = match ? match[1] : "";
  const postalCode = match ? match[2] : "";
  const city = parts.length >= 2 ? parts[parts.length - 2] : "";
  const street = parts.slice(0, Math.max(0, parts.length - 2)).join(", ");

  const lines = [];

  if (street) lines.push(street);

  if (city && province) {
    lines.push(`${city} ${province}`);
  } else if (city) {
    lines.push(city);
  } else if (province) {
    lines.push(province);
  }

  if (postalCode) {
    lines.push(postalCode);
  } else if (lastPart && !province) {
    lines.push(lastPart);
  }

  return lines.map((line) => `<div>${esc(line)}</div>`).join("");
}

function buildSalesPopupHTML(props) {
  const name = cleanValue(props.sale_name) ? esc(props.sale_name) : "Garage Sale";
  const typeText = isGarageSaleDay(props)
    ? "Garage Sale Day"
    : cleanValue(props.timing_category)
    ? esc(props.timing_category)
    : null;
  const notes = cleanValue(props.description) ? esc(props.description) : "";
  const scheduleText = cleanValue(props.schedule_text)
    ? esc(props.schedule_text).replace(/\n/g, "<br>")
    : "";
  const directionsUrl = cleanValue(props.directions_url);
  const addressHtml = formatAddressHTML(cleanValue(props.address));

  const timingKey = cleanValue(props.timing_category)
    ? String(props.timing_category).trim().toLowerCase().replace(/\s+/g, "_")
    : "";

  const iconHtml = isGarageSaleDay(props)
    ? `<img class="popup-flag" src="icons/garage_sale_day.png" alt="Garage Sale Day">`
    : timingKey
    ? `<img class="popup-flag" src="icons/${esc(timingKey)}.png" alt="${esc(props.timing_category)}">`
    : "";

  const dateText =
    cleanValue(props.start_date) && cleanValue(props.end_date)
      ? props.start_date !== props.end_date
        ? `${esc(props.start_date)} to ${esc(props.end_date)}`
        : esc(props.start_date)
      : cleanValue(props.start_date)
      ? esc(props.start_date)
      : "";

  return `
    <div class="sea-card">
      <div class="sea-header">
        <div class="sea-title">${name}</div>
        ${iconHtml}
      </div>

      <div class="sea-rows">
        ${typeText ? rowHTML("When:", `<span class="sea-text">${typeText}</span>`) : ""}
        ${dateText ? rowHTML("Date:", `<span class="sea-text">${dateText}</span>`) : ""}
        ${scheduleText ? rowHTML("Schedule:", `<div class="sea-notes">${scheduleText}</div>`) : ""}
        ${notes ? rowHTML("Details:", `<div class="sea-notes">${notes}</div>`) : ""}
        ${rowHTML("Disclaimer:", `<div class="sea-disclaimer">Disclaimer: This map is populated using user-generated content. If you arrive at a location and find that the information is incorrect or outdated, please do not disturb homeowners and let us know at scarbenvasc@gmail.com!</div>`)}
        </div>

      ${
        directionsUrl || addressHtml
          ? `
            <div class="sea-footer sea-footer--card">
              ${addressHtml ? `<div class="sea-address">${addressHtml}</div>` : `<div></div>`}
              ${
                directionsUrl
                  ? `
                    <a
                      class="sea-directions"
                      href="${esc(directionsUrl)}"
                      target="_blank"
                      rel="noopener"
                      aria-label="Get directions"
                    >
                      <span class="sea-dir-icon" aria-hidden="true"></span>
                      <span class="sea-dir-label">Get Directions</span>
                    </a>
                  `
                  : `<div></div>`
              }
            </div>
          `
          : ""
      }
    </div>
  `;
}

function styleForFeature(feature, cfg) {
  return cfg.style ? cfg.style(feature) : undefined;
}

function onEachFeature(feature, layer, cfg) {
  if (!cfg.popupBuilder) return;

  const props = feature.properties || {};
  const html = cfg.popupBuilder(props);

  if (html) {
    layer.bindPopup(html, { maxWidth: 520 });
  }
}

function makeLayerFromGeojson(geojson, cfg) {
  return L.geoJSON(geojson, {
    pane: cfg.pane,
    style: (feature) => styleForFeature(feature, cfg),
    pointToLayer: cfg.pointToLayer
      ? (feature, latlng) => cfg.pointToLayer(feature, latlng, cfg)
      : undefined,
    onEachFeature: (feature, layer) => onEachFeature(feature, layer, cfg),
  });
}

function buildSaleTypesFromGeojson(geojson) {
  const groups = new Set();

  (geojson.features || []).forEach((feature) => {
    const props = feature.properties || {};
    const typeName = String(props.timing_category || "").trim();
    if (typeName ) groups.add(typeName);
  });

  return Array.from(groups).sort();
}

function buildSalesLayer(cfg) {
  if (!salesGeojson) return L.layerGroup();

  const filteredGeojson =
    salesFilter === "ALL"
      ? salesGeojson
      : {
          ...salesGeojson,
          features: salesGeojson.features.filter(
            (feature) =>
              (feature.properties?.timing_category || "").trim() === salesFilter
          ),
        };

  return makeLayerFromGeojson(filteredGeojson, cfg);
}

function refreshSalesLayer() {
  const cfg = LAYER_CONFIGS.find((layer) => layer.id === "sales");
  if (!cfg || !salesGeojson) return;

  const layerWasVisible = salesLayer && map.hasLayer(salesLayer);

  if (layerWasVisible) {
    map.removeLayer(salesLayer);
  }

  salesLayer = buildSalesLayer(cfg);
  overlayLayers[cfg.id] = salesLayer;

  if (layerWasVisible) {
    salesLayer.addTo(map);
  }

  rebuildLegend();
}

function rebuildLegend() {
  const select = document.getElementById("type-filter");
  if (!select) return;

  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "ALL";
  allOption.textContent = "All types";
  select.appendChild(allOption);

  salesTypes.forEach((typeName) => {
    const option = document.createElement("option");
    option.value = typeName;
    option.textContent = typeName;
    select.appendChild(option);
  });

  select.value = salesFilter;

  select.onchange = (event) => {
    salesFilter = event.target.value;
    refreshSalesLayer();
  };
}

function isGarageSaleDay(props) {
  const garageSaleDay = cleanValue(props.garage_sale_day);
  if (!garageSaleDay || !props.start_date) return false;

  const start = String(props.start_date).trim();
  const end = props.end_date ? String(props.end_date).trim() : start;

  return start <= garageSaleDay && end >= garageSaleDay;
}

function loadGeoData(url) {

  const isCSV = url.toLowerCase().includes(".csv") || url.includes("output=csv");

  if (!isCSV) {
    return fetch(url).then(res => res.json());
  }

  return new Promise((resolve, reject) => {

    Papa.parse(url, {
      download: true,
      header: true,
      complete: function(results) {

const features = results.data
  .filter(row => !Number.isNaN(parseFloat(row.latitude)) && !Number.isNaN(parseFloat(row.longitude)))
  .filter(row => String(row.show_on_map || "").trim().toUpperCase() === "Y")
  .map(row => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [
        parseFloat(row.longitude),
        parseFloat(row.latitude)
      ]
    },
    properties: row
  }));

        resolve({
          type: "FeatureCollection",
          features: features
        });

      },
      error: reject
    });

  });

}

const legendControl = L.control({ position: "topright" });

legendControl.onAdd = function () {
  const container = L.DomUtil.create("div", "layer-legend");

  container.innerHTML = `
    <div class="legend-panel">
      <div class="legend-panel-header">
        <h3>Garage Sales</h3>
        <button class="legend-close" type="button" aria-label="Close filters">✕</button>
      </div>

      <div class="legend-filter">
        <div class="legend-filter-label">Filter by Time</div>
        <select id="type-filter"></select>
      </div>

      <details class="legend-about">
        <summary class="legend-about-summary">About</summary>
        <div class="legend-about-body">
         <p><a class="legend-link" href="${PROJECT.suggestionsUrl}" target="_blank" rel="noopener">Advertise Your Sale</a></p>
          <p class="sea-disclaimer">Disclaimer: This map is populated using user-generated content. If you arrive at a location and find that the information is incorrect or outdated, please do not disturb homeowners and let us know!</p>
        </div>
      </details>
    </div>
  `;

  L.DomEvent.disableClickPropagation(container);
  return container;
};

legendControl.addTo(map);

function wireLegendControls() {
  const legend = document.querySelector(".layer-legend");
  const closeBtn = document.querySelector(".legend-close");

  if (!legend || !closeBtn) return;

  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    legend.classList.remove("is-open");
  });
}

wireLegendControls();

const legendToggleControl = L.control({ position: "bottomright" });

legendToggleControl.onAdd = function () {
  const container = L.DomUtil.create("div", "legend-toggle-btn leaflet-bar");
  const link = L.DomUtil.create("a", "", container);

  link.href = "#";
  link.title = "Filters";
  link.setAttribute("aria-label", "Open filters");
  link.innerHTML = "☰";

  L.DomEvent.disableClickPropagation(container);

  L.DomEvent.on(link, "click", (event) => {
    L.DomEvent.preventDefault(event);
    const panel = document.querySelector(".layer-legend");
    if (panel) panel.classList.toggle("is-open");
  });

  return container;
};

legendToggleControl.addTo(map);

LAYER_CONFIGS.forEach((cfg) => {

  loadGeoData(cfg.url)
    .then((geojson) => {

      if (cfg.id === "sales") {

        salesGeojson = geojson;
        salesTypes = buildSaleTypesFromGeojson(geojson);
        salesLayer = buildSalesLayer(cfg);

        overlayLayers[cfg.id] = salesLayer;

        if (cfg.defaultVisible) {
          salesLayer.addTo(map);
        }

        rebuildLegend();
        return;
      }

      const layer = makeLayerFromGeojson(geojson, cfg);
      overlayLayers[cfg.id] = layer;

      if (cfg.defaultVisible) {
        layer.addTo(map);
      }

    })
    .catch((err) => {
      console.error(`Error loading ${cfg.url}`, err);
    });

});

const resetControl = L.control({ position: "topleft" });

resetControl.onAdd = function () {
  const container = L.DomUtil.create("div", "leaflet-bar reset-control");
  const link = L.DomUtil.create("a", "", container);

  link.href = "#";
  link.title = "Reset view";
  link.innerHTML = "⟳";

  L.DomEvent.on(link, "click", (event) => {
    L.DomEvent.stop(event);
    map.setView(PROJECT.initialCenter, PROJECT.initialZoom);
  });

  return container;
};

resetControl.addTo(map);


