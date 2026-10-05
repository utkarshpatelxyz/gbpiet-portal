  <script>
  /* ── Embedded-app host (one frame per app) ─────────────────────────── */
  (function () {
    var host   = document.getElementById('mrd-app-host');
    var frame  = document.getElementById('mrd-app-frame');
    var landing= document.getElementById('mrd-project-landing');
    var nameEl = document.getElementById('mrd-app-name');
    var backBtn= document.getElementById('mrd-app-back');
    var backTx = document.getElementById('mrd-app-back-t');
    var logoBtn= document.getElementById('mrd-app-logo');

    /* What is open in the host, for the help button and for the way back.
       `from` is the view the app was opened from: the launchpad, or the
       Engineering Review Tool for the tank checklist on its dock. */
    var state = window.mrdHost = { open: false, key: null, title: '', from: 'main' };
    function emit() {
      try { document.dispatchEvent(new CustomEvent('mrd:context')); } catch (e) {}
    }
    function currentView() {
      return (typeof SPA_STATE !== 'undefined' && SPA_STATE.currentView) || 'main';
    }

    /* ── Per-module launch splash ─────────────────────────────────────── */
    var splash     = document.getElementById('mrd-module-splash');
    var splashName = document.getElementById('mms-name');
    var splashT1 = null, splashT2 = null;

    window.showModuleSplash = function (name) {
      if (!splash) return;
      splashName.textContent = name || '';
      clearTimeout(splashT1); clearTimeout(splashT2);
      // Restart the CSS reveal animations from the top on every launch.
      splash.classList.remove('open', 'closing');
      void splash.offsetWidth;              // force reflow
      splash.classList.add('open');
      if (window.mrdTabBusy) window.mrdTabBusy(true, name, 'splash');
      splashT1 = setTimeout(function () {
        splash.classList.add('closing');
        splashT2 = setTimeout(function () {
          splash.classList.remove('open', 'closing');
          if (window.mrdTabBusy) window.mrdTabBusy(false, '', 'splash');
        }, 480);
      }, 1650);
    };

    /* Document Review Management and P6 PLAN4E open with their own 3D
       opening, so the suite's splash would only play the same thing twice. */
    var OWN_OPENING = { drm: 1, p6: 1 };

    /* ── Loading an app ───────────────────────────────────────────────────
       Each app is written into its frame with srcdoc, so it shares this
       file's origin and behaves exactly as it does opened on its own: its
       localStorage (engineer lists, look-ahead, theme, ASME progress), its
       clipboard copy, its downloads and its #/ links all work.  A blob: URL
       would not — opened from a file on disk, the browser gives that page no
       origin, and refuses it storage, the clipboard and every #link.

       The only addition is <base href="about:srcdoc"> ahead of everything in
       <head>, so a link such as "#/library" stays inside the app instead of
       resolving against this file.  The app's own bytes are untouched. */
    var BASE = '<base href="about:srcdoc">';

    /* ── One bar, not two ─────────────────────────────────────────────────
       Each app's own top bar is hidden inside its frame, and what it carried
       — the crumbs, the way home, the project chip, the settings gear, the
       ASME lab's sections, search and theme — is mirrored into the MERIDIAM
       bar.  A mirrored control clicks the app's own one, so every function
       stays the app's; the bar re-reads the app's bar whenever it changes.
       The tank checklist keeps its header: it is a form, not a bar. */
    var HIDE = {
      drm:    '.nav{display:none!important}',
      p6:     '.nav{display:none!important}',
      ceyhan: '.nav{display:none!important}',
      asme:   ':root{--header-h:0px!important}.hdr,.mnav{display:none!important}'
    };
    var SHORT = { asme: 'ASME VIII-1 Visualiser' };
    var HOME_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.4 10.6 12 3.6l8.6 7"/><path d="M5.6 9.4V20h12.8V9.4"/></svg>';
    function txt(e) { return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
    function shown(e) { return !!e && e.style.display !== 'none' && !!e.innerHTML.trim(); }
    function toolBar(d) {                       // Document Review and P6 PLAN4E
      var L = [], R = [];
      var home = d.getElementById('btn-home');
      var cr = d.getElementById('crumbs');
      /* the crumbs often start with Home already; then the button would say it twice */
      var homeCrumb = cr && cr.firstElementChild && txt(cr.firstElementChild) === 'Home';
      if (home && home.classList.contains('on') && !homeCrumb) L.push({ t: 'btn', html: HOME_SVG + '<span>Home</span>', el: home, title: home.title });
      if (cr) [].forEach.call(cr.children, function (c) {
        if (c.classList.contains('s')) L.push({ t: 'sep', text: txt(c) || '/' });
        else L.push({ t: 'crumb', text: txt(c), on: c.classList.contains('on'), el: c.classList.contains('on') ? null : c });
      });
      var chip = d.getElementById('navinfo');
      if (shown(chip)) R.push({ t: 'chip', html: chip.innerHTML });
      var g = d.getElementById('btn-roster');
      if (g) R.push({ t: 'icon', html: g.innerHTML, el: g, title: g.title || 'Settings' });
      return { L: L, R: R };
    }
    var BAR = {
      drm: { root: '.nav', read: toolBar },
      p6:  { root: '.nav', read: toolBar },
      ceyhan: { root: '.nav', read: function (d) {
        return { L: [].map.call(d.querySelectorAll('.nav nav a'), function (a) {
          return { t: 'link', text: txt(a), el: a };
        }), R: [] };
      } },
      asme: { root: '.hdr', read: function (d) {
        var L = [].map.call(d.querySelectorAll('.hdr-nav a'), function (a) {
          return { t: 'link', text: txt(a), on: a.classList.contains('active'), el: a };
        });
        var R = [], s = d.getElementById('openPalette'), th = d.getElementById('themeBtn');
        if (s) R.push({ t: 'search', text: txt(s.querySelector('.grow')) || 'Search', kbd: txt(s.querySelector('kbd')), el: s });
        if (th) R.push({ t: 'icon', html: th.innerHTML, el: th, title: th.getAttribute('aria-label') || 'Theme' });
        return { L: L, R: R };
      } }
    };
    var barL = document.getElementById('mrd-bar-l'), barR = document.getElementById('mrd-bar-r');
    var barObs = null, barPoll = null, barRAF = 0, barApp = null;
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function control(it) {
      var e;
      if (it.t === 'sep') { e = document.createElement('span'); e.className = 'mrd-bar-sep'; e.textContent = it.text; return e; }
      if (it.t === 'chip') { e = document.createElement('div'); e.className = 'mrd-bar-chip'; e.innerHTML = it.html; return e; }
      e = document.createElement('button'); e.type = 'button';
      e.className = 'mrd-bar-' + it.t + (it.on ? ' on' : '');
      if (it.t === 'search') {
        e.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" ' +
          'stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
          '<span class="q">' + esc(it.text) + '</span>' + (it.kbd ? '<kbd>' + esc(it.kbd) + '</kbd>' : '');
      } else if (it.html) e.innerHTML = it.html;
      else e.textContent = it.text;
      if (it.title) { e.title = it.title; e.setAttribute('aria-label', it.title); }
      if (it.on) e.setAttribute('aria-current', 'page');
      if (it.el) e.addEventListener('click', function (ev) {
        ev.preventDefault();
        it.el.click();
        try { frame.contentWindow.focus(); } catch (err) {}
      });
      return e;
    }
    function paintBar() {
      barRAF = 0;
      var spec = BAR[barApp], d = null;
      try { d = frame.contentDocument; } catch (e) {}
      if (!spec || !d) return;
      var m = spec.read(d);
      barL.textContent = ''; barR.textContent = '';
      m.L.forEach(function (it) { barL.appendChild(control(it)); });
      m.R.forEach(function (it) { barR.appendChild(control(it)); });
    }
    function clearBar() {
      if (barObs) { barObs.disconnect(); barObs = null; }
      clearInterval(barPoll); barPoll = null; barApp = null;
      barL.textContent = ''; barR.textContent = '';
    }
    function watchBar(key, f) {
      clearBar();
      var spec = BAR[key];
      if (!spec) return;
      barApp = key;
      var t0 = Date.now();
      barPoll = setInterval(function () {
        var d = null;
        try { d = f.contentDocument; } catch (e) {}
        var root = d && d.URL === 'about:srcdoc' && d.querySelector(spec.root);
        if (!root) { if (Date.now() - t0 > 15000) clearInterval(barPoll); return; }
        clearInterval(barPoll); barPoll = null;
        paintBar();
        barObs = new MutationObserver(function () { if (!barRAF) barRAF = requestAnimationFrame(paintBar); });
        barObs.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
      }, 60);
    }
    /* Ctrl/⌘ K reaches the ASME search even while focus is on the bar. */
    document.addEventListener('keydown', function (e) {
      if (!state.open || state.key !== 'asme' || !(e.ctrlKey || e.metaKey) || (e.key || '').toLowerCase() !== 'k') return;
      var s = barR.querySelector('.mrd-bar-search');
      if (s) { e.preventDefault(); s.click(); }
    });

    function appHTML(b64, key) {
      var bin = atob(b64);
      var len = bin.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      var html = new TextDecoder('utf-8').decode(bytes);
      var lead = html.slice(0, 8192), at = 0;
      var m = /<head\b[^>]*>/i.exec(lead);
      if (m) at = m.index + m[0].length;
      else { var d = /<!doctype[^>]*>/i.exec(lead); if (d) at = d.index + d[0].length; }
      var hide = HIDE[key] ? '<style id="mrd-suite-embed">' + HIDE[key] + '</style>' : '';
      return html.slice(0, at) + BASE + hide + html.slice(at);
    }
    /* A new frame for every app: its first load replaces the blank page
       rather than adding to the browser's history, so Back never lands on an
       empty app.  Closing swaps in an empty frame, which unloads the app. */
    function newFrame(html) {
      var f = document.createElement('iframe');
      f.id = 'mrd-app-frame';
      f.title = 'MERIDIAM application';
      if (html != null) f.srcdoc = html;
      f.style.display = html != null ? 'block' : 'none';
      frame.parentNode.replaceChild(f, frame);
      frame = f;
      return f;
    }

    /* The way back says where it goes. */
    function setReturn() {
      var v = currentView();
      state.from = v;
      var toTool = v !== 'main';
      var label = toTool ? 'Engineering Review Tool' : 'All apps';
      backTx.textContent = label;
      backBtn.classList.toggle('is-back', toTool);
      backBtn.title = toTool ? 'Back to the Engineering Review Tool' : 'Back to all apps';
      logoBtn.title = backBtn.title;
      logoBtn.setAttribute('aria-label', backBtn.title);
    }

    // Project-picker landing.
    var LANDINGS = {
      project: {
        name: 'Project Details', eyebrow: 'Project Details',
        title: 'Select a project',
        sub: 'Open a project to explore its static-equipment intelligence.',
        projects: [{ code: '10410', name: 'CEYHAN PDH-PP Project',
                     app: 'ceyhan', title: '10410 — CEYHAN PDH-PP Project' }]
      }
    };

    var APPS = {
      drm:  'Document Review Management',
      p6:   'P6 PLAN4E Milestone Management',
      asme: 'ASME Section VIII Division 1 Visualiser'
    };

    window.openModule = function (key) {
      var L = LANDINGS[key];
      if (L) {
        if (!state.open) setReturn();
        nameEl.textContent = L.name;
        document.getElementById('mrd-pl-eyebrow').textContent = L.eyebrow;
        document.getElementById('mrd-pl-title').textContent = L.title;
        document.getElementById('mrd-pl-sub').textContent = L.sub;
        document.getElementById('mrd-pl-list').innerHTML = L.projects.map(function (p) {
          return '<button class="mrd-project-btn" onclick="openEmbeddedApp(\'' + p.app + '\',\'' +
                 p.title.replace(/'/g, "\\'") + '\')">' +
                 '<span class="mrd-project-code">' + p.code + '</span>' +
                 '<span class="mrd-project-name">' + p.name + '</span>' +
                 '<span class="mrd-project-arrow">→</span></button>';
        }).join('');
        var mm = document.getElementById('mrd-app-missing'); if (mm) mm.style.display = 'none';
        landing.style.display = 'flex';
        clearBar();
        newFrame(null);
        host.style.display = 'flex';
        state.open = true; state.key = key; state.title = L.name;
        document.title = 'MERIDIAM — ' + L.name;
        showModuleSplash(L.name);
        emit();
      } else if (key === 'vendor') {
        openEmbeddedApp('drm', APPS.drm);
      } else if (APPS[key]) {
        openEmbeddedApp(key, APPS[key]);
      }
    };

    window.openEmbeddedApp = function (appKey, title) {
      var apps = window.__MRD_APPS__ || {};
      var b64 = apps[appKey];
      if (!state.open) setReturn();
      nameEl.textContent = SHORT[appKey] || title || '';
      nameEl.title = title || '';
      if (!OWN_OPENING[appKey]) showModuleSplash(title || '');
      landing.style.display = 'none';
      state.open = true; state.key = appKey; state.title = title || '';
      document.title = 'MERIDIAM — ' + (title || '');
      if (!b64) {
        // Payload not embedded — show a graceful message rather than a blank frame.
        clearBar();
        newFrame(null);
        host.style.display = 'flex';
        if (!document.getElementById('mrd-app-missing')) {
          var m = document.createElement('div');
          m.id = 'mrd-app-missing';
          m.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;color:#5B7C9D;font-size:14px;text-align:center;padding:40px;';
          m.textContent = 'This application has not been embedded in this build.';
          host.appendChild(m);
        }
        document.getElementById('mrd-app-missing').style.display = 'flex';
        emit();
        return;
      }
      var mm = document.getElementById('mrd-app-missing'); if (mm) mm.style.display = 'none';
      if (window.mrdTabBusy) window.mrdTabBusy(true, title);
      var f = newFrame(appHTML(b64, appKey));
      watchBar(appKey, f);
      var done = function () { if (frame === f && window.mrdTabBusy) window.mrdTabBusy(false); };
      f.addEventListener('load', done, { once: true });
      setTimeout(done, 12000);
      host.style.display = 'flex';
      try { frame.focus(); } catch (e) {}
      emit();
    };

    window.closeEmbeddedApp = function () {
      host.style.display = 'none';
      clearBar();
      newFrame(null);
      if (window.mrdTabBusy) window.mrdTabBusy(false);
      landing.style.display = 'none';
      var back = state.from === 'main' ? 'main' : currentView();
      state.open = false; state.key = null; state.title = '';
      if (typeof showView === 'function') showView(back);
      /* Back on the review tool's dock after the tank: put the dock back
         the way the drum review leaves it, so the next icon can be opened. */
      if (back === 'home' && window.__resetHomeSpaState) window.__resetHomeSpaState();
      emit();
    };
  })();
  </script>
