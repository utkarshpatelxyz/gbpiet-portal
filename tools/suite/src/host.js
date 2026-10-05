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
      splashT1 = setTimeout(function () {
        splash.classList.add('closing');
        splashT2 = setTimeout(function () {
          splash.classList.remove('open', 'closing');
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
    function appHTML(b64) {
      var bin = atob(b64);
      var len = bin.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      var html = new TextDecoder('utf-8').decode(bytes);
      var lead = html.slice(0, 8192), at = 0;
      var m = /<head\b[^>]*>/i.exec(lead);
      if (m) at = m.index + m[0].length;
      else { var d = /<!doctype[^>]*>/i.exec(lead); if (d) at = d.index + d[0].length; }
      return html.slice(0, at) + BASE + html.slice(at);
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
      nameEl.textContent = title || '';
      if (!OWN_OPENING[appKey]) showModuleSplash(title || '');
      landing.style.display = 'none';
      state.open = true; state.key = appKey; state.title = title || '';
      document.title = 'MERIDIAM — ' + (title || '');
      if (!b64) {
        // Payload not embedded — show a graceful message rather than a blank frame.
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
      newFrame(appHTML(b64));
      host.style.display = 'flex';
      try { frame.focus(); } catch (e) {}
      emit();
    };

    window.closeEmbeddedApp = function () {
      host.style.display = 'none';
      newFrame(null);
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
