<script>
/* Tievie fixes v3.40
   - Streaming multi-select als overlay (boven alles, met Apply/Reset)
   - Filter werkt bovenop bestaande zoek/categorie-logica via app.filtered() wrapper
   - IMDb-score inline bewerken (dubbelklik op de IMDb-score in een kaart)
   - Hardening: alles guarded; geen hard errors → geen “witte pagina”
*/

(function () {
  "use strict";

  // ---------- Helpers ----------
  const OMDB_KEY = "8a70a767"; // gebruikt voor eventuele refresh/overlay (ongewijzigd)
  const byId = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const safe = (fn) => { try { return fn(); } catch (_) { return undefined; } };

  // Normalisatie van streaming-diensten (sluit aan bij eerdere afspraken)
  const normalizeStream = (s) => {
    if (!s) return "";
    const v = String(s).trim().toLowerCase();
    if (v.startsWith("appl")) return "Apple TV+";
    if (v.startsWith("netf")) return "Netflix";
    if (v.startsWith("prim")) return "Prime Video";
    if (v.startsWith("vrt")) return "VRT MAX";
    if (v.startsWith("vtm")) return "VTM Go";
    if (v.includes("play")) return "Go Play";
    if (v.startsWith("np")) return "NPO";
    if (v.startsWith("strea")) return "Streamz";
    if (v.startsWith("disn")) return "Disney+";
    return ""; // Onbekend
  };

  const STREAM_LIST = [
    "Streamz",
    "Netflix",
    "Prime Video",
    "Apple TV+",
    "VRT MAX",
    "Go Play",
    "NPO",
    "Disney+",
    "Onbekend"
  ];

  function ensureAppState() {
    window.app = window.app || {};
    app.state = app.state || {};
    if (!Array.isArray(app.state.filterStreaming)) {
      // leeg = geen filter
      app.state.filterStreaming = [];
    }
  }

  // ---------- Streaming multi-select overlay ----------
  function buildStreamingOverlay(anchorButton) {
    if (byId("streaming-overlay")) return;

    const wrap = document.createElement("div");
    wrap.id = "streaming-overlay";
    Object.assign(wrap.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(2,6,23,0.58)",
      backdropFilter: "blur(3px)",
      zIndex: "100000", // boven ALLES
      display: "none",
      alignItems: "center",
      justifyContent: "center"
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      width: "min(520px,92vw)",
      background: "#0b1020",
      border: "1px solid rgba(148,163,184,.3)",
      borderRadius: "14px",
      boxShadow: "0 20px 60px rgba(0,0,0,.55)",
      color: "#e5e7eb",
      overflow: "hidden"
    });

    const header = document.createElement("div");
    header.textContent = "Streaming filter";
    Object.assign(header.style, {
      padding: "10px 14px",
      background: "#111827",
      fontWeight: "700"
    });

    const body = document.createElement("div");
    Object.assign(body.style, { padding: "14px" });

    const list = document.createElement("div");
    Object.assign(list.style, {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "10px",
      marginBottom: "12px"
    });

    STREAM_LIST.forEach((label) => {
      const id = "s_" + label.replace(/\W+/g, "_");
      const row = document.createElement("label");
      row.htmlFor = id;
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "10px";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = id;
      cb.value = label === "Onbekend" ? "__UNKNOWN__" : label;
      row.appendChild(cb);
      const span = document.createElement("span");
      span.textContent = label;
      row.appendChild(span);
      list.appendChild(row);
    });

    const btns = document.createElement("div");
    Object.assign(btns.style, { display: "flex", gap: "8px", justifyContent: "flex-end" });

    const bAll = document.createElement("button");
    bAll.textContent = "Alles";
    bAll.className = "pill";
    stylePill(bAll);

    const bGeen = document.createElement("button");
    bGeen.textContent = "Niets";
    bGeen.className = "pill";
    stylePill(bGeen);

    const bApply = document.createElement("button");
    bApply.textContent = "Toepassen";
    bApply.className = "pill";
    stylePill(bApply, "#22c55e", "#052e1a");

    const bClose = document.createElement("button");
    bClose.textContent = "Sluiten";
    bClose.className = "pill";
    stylePill(bClose, "#334155");

    btns.append(bAll, bGeen, bClose, bApply);
    body.append(list, btns);
    panel.append(header, body);
    wrap.append(panel);
    document.body.appendChild(wrap);

    // helpers
    const getChecks = () => $$("#" + list.id + " input[type=checkbox]", list);
    const checks = $$("#input[type=checkbox]", list) || $$("#input:not(.x)", list); // fallback
    const allCbs = $$("#input[type=checkbox]", list).length ? $$("#input[type=checkbox]", list) : $$("#" + list.id + " input");

    function setFromState() {
      ensureAppState();
      const set = new Set(app.state.filterStreaming);
      $$("#" + list.id + " input[type=checkbox], input[type=checkbox]", list).forEach((cb) => {
        cb.checked = set.has(cb.value);
      });
    }

    // initial
    setFromState();

    bAll.onclick = () => {
      $$("#" + list.id + " input[type=checkbox], input[type=checkbox]", list).forEach((cb) => (cb.checked = true));
    };
    bGeen.onclick = () => {
      $$("#" + list.id + " input[type=checkbox], input[type=checkbox]", list).forEach((cb) => (cb.checked = false));
    };
    bClose.onclick = () => (wrap.style.display = "none");
    bApply.onclick = () => {
      ensureAppState();
      const selected = $$("#" + list.id + " input[type=checkbox], input[type=checkbox]", list)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value);
      app.state.filterStreaming = selected; // lege array = geen filter
      safe(() => app.render && app.render());
      wrap.style.display = "none";
    };

    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) wrap.style.display = "none";
    });

    // open handler
    anchorButton.addEventListener("click", (e) => {
      e.preventDefault();
      setFromState();
      wrap.style.display = "flex";
    });
  }

  function stylePill(btn, bg = "#1f2937", fg = "#e5e7eb") {
    Object.assign(btn.style, {
      background: bg,
      color: fg,
      border: "0",
      padding: "8px 12px",
      borderRadius: "10px",
      cursor: "pointer"
    });
  }

  function mountStreamingTrigger() {
    // Zoek de bestaande streaming-<select> (met optie "Alle diensten") en vervang die door een knop
    const selects = $$("select");
    let streamingSelect = selects.find((sel) =>
      Array.from(sel.options || []).some((o) => /alle diensten/i.test(o.text || ""))
    );

    // Als niet gevonden: maak gewoon een knop rechtsboven in de toolbar
    let anchor;
    if (streamingSelect) {
      // Verberg originele select
      streamingSelect.style.display = "none";

      anchor = document.createElement("button");
      anchor.id = "btn-streaming-multi";
      anchor.textContent = "Streaming ▾";
      stylePill(anchor, "#0ea5e9");
      streamingSelect.parentElement.insertBefore(anchor, streamingSelect);
    } else {
      // Fallback: rechts in de bovenbalk
      const bar =
        document.querySelector("header .flex.gap-2") ||
        document.querySelector("header .mb-3 .flex.gap-2") ||
        document.querySelector("#topbar-actions") ||
        document.body;

      anchor = document.createElement("button");
      anchor.id = "btn-streaming-multi";
      anchor.textContent = "Streaming ▾";
      stylePill(anchor, "#0ea5e9");
      bar.appendChild(anchor);
    }

    buildStreamingOverlay(anchor);

    // Patch filtering éénmaal
    if (!app.__streamFilterPatched && typeof app.filtered === "function") {
      const orig = app.filtered.bind(app);
      app.filtered = function () {
        ensureAppState();
        let arr = orig();
        const sel = app.state.filterStreaming || [];
        if (sel.length === 0) return arr;

        return arr.filter((it) => {
          const norm = normalizeStream(it.streamingOn);
          if (sel.includes("__UNKNOWN__")) {
            return norm ? sel.includes(norm) : true;
          }
          return sel.includes(norm);
        });
      };
      app.__streamFilterPatched = true;
    }
  }

  // ---------- IMDb-score bewerken (dubbelklik op score in kaart) ----------
  function enableImdbInlineEdit() {
    const root = document.body;

    function attach(rootNode) {
      // Zoek score-elementen op de kaarten – zo tolerant mogelijk:
      // - spans/divs die "IMDb" bevatten
      // - knoppen/labels met "IMDb Info" laten we met rust; we richten ons op score-tekst
      const candidates = $$("div,span", rootNode).filter((el) => {
        const t = (el.textContent || "").trim();
        if (!/imdb/i.test(t)) return false;
        // wil score bevatten of "N/B", "N/A"
        return /imdb\s*[: ]/i.test(t) || /imdb/i.test(t);
      });

      candidates.forEach((node) => {
        if (node.__imdbEditBound) return;
        node.__imdbEditBound = true;

        node.addEventListener("dblclick", async (ev) => {
          ev.stopPropagation();
          const card = node.closest("[data-item-id]") || node.closest(".card") || node.closest("article");
          if (!card) return;
          const id = card.getAttribute("data-item-id");
          if (!id) return;

          const currentItems = (await safe(() => window.dbGetAll && window.dbGetAll())) || app.state.items || [];
          const item = currentItems.find((x) => x.id === id);
          if (!item) return;

          const cur = item.imdbRating || "";
          const val = prompt("Nieuwe IMDb-score (bv. 7.8 of leeg voor onbekend):", cur);
          if (val === null) return;

          const clean = String(val).trim();
          if (clean && !/^\d{1,2}(\.\d)?$/.test(clean)) {
            alert("Ongeldig formaat. Gebruik bv. 7.8 of laat leeg.");
            return;
          }

          item.imdbRating = clean || null;

          await safe(() => window.dbPut && window.dbPut(item));
          const all = (await safe(() => window.dbGetAll && window.dbGetAll())) || [];
          app.state.items = all;
          safe(() => app.render && app.render());
          safe(() => window.syncPushDebounced && window.syncPushDebounced());
        });
      });
    }

    // initial + mutatie-observer om nieuwe kaarten te hooken
    attach(document);
    const mo = new MutationObserver((muts) => {
      muts.forEach((m) => {
        m.addedNodes && m.addedNodes.forEach((n) => n.nodeType === 1 && attach(n));
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    ensureAppState();
    safe(mountStreamingTrigger);
    safe(enableImdbInlineEdit);
  });
})();
</script>
