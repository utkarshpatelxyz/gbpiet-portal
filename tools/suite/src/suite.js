  <script>
  /* ── Authorship ───────────────────────────────────────────────────────
     The suite is signed with its author's profile (the card behind the
     profile button).  The launchpad and the app host read the name, the
     LinkedIn address and the email from that card, and run only while they
     match the signature written into this file at build time. */
  (function () {
    var SIG = __AUTHOR_SIG__;
    function fnv(str) {
      var h = 0x811c9dc5;
      for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
      return h >>> 0;
    }
    function read() {
      var card = document.getElementById('mrd-pf-card');
      var btn = document.getElementById('mrd-pf-btn');
      if (!card || !btn) return null;
      var q = function (s) { return card.querySelector(s); };
      var name = q('.mrd-pf-name'), li = q('.mrd-pf-li'), mail = q('.mrd-pf-mail'), img = q('.mrd-pf-img');
      if (!name || !li || !mail || !img) return null;
      if (!/^data:image\/jpeg;base64,/.test(img.getAttribute('src') || '') || img.getAttribute('src').length < 4000) return null;
      return [name.textContent.trim(), li.textContent.trim(), li.getAttribute('href'),
              mail.textContent.trim(), mail.getAttribute('href')].join('|');
    }
    window.mrdAuthorOk = function () {
      var r = read();
      return r !== null && fnv(r) === SIG;
    };
  })();
  </script>

  <script>
  /* ── The browser tab: the MERIDIAM mark, and a spinner while loading ──
     The icon is a navy tile with a white M.  While the suite opens, or an
     app loads, a ring turns around the M and the tab title carries a small
     spinner; both settle back when the work is done. */
  (function () {
    var link = document.getElementById('mrd-favicon');
    if (!link) return;
    var STATIC = link.href;
    var cv = document.createElement('canvas'); cv.width = cv.height = 64;
    var cx = cv.getContext('2d');
    var reasons = {}, timer = null, step = 0, base = null, lastSet = null;
    var SPIN = ['\u25D0', '\u25D3', '\u25D1', '\u25D2'];
    function tile() {
      var g = cx.createLinearGradient(0, 0, 64, 64);
      g.addColorStop(0, '#12395C'); g.addColorStop(1, '#0B2545');
      cx.fillStyle = g;
      cx.beginPath();
      if (cx.roundRect) cx.roundRect(0, 0, 64, 64, 14); else cx.rect(0, 0, 64, 64);
      cx.fill();
    }
    function frame() {
      step++;
      cx.clearRect(0, 0, 64, 64);
      tile();
      var a = step * 0.42;
      cx.lineWidth = 6; cx.lineCap = 'round';
      cx.strokeStyle = 'rgba(255,255,255,.18)';
      cx.beginPath(); cx.arc(32, 32, 24, 0, Math.PI * 2); cx.stroke();
      cx.strokeStyle = '#45C0CE';
      cx.beginPath(); cx.arc(32, 32, 24, a, a + Math.PI * 1.2); cx.stroke();
      cx.fillStyle = '#fff';
      cx.font = '800 26px Montserrat, "Segoe UI", Arial, sans-serif';
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText('M', 32, 34);
      link.href = cv.toDataURL('image/png');
      if (document.title !== lastSet) base = document.title;
      lastSet = SPIN[step % 4] + ' ' + base;
      document.title = lastSet;
    }
    window.mrdTabBusy = function (on, label, why) {
      why = why || 'app';
      if (on) reasons[why] = 1; else delete reasons[why];
      var busy = Object.keys(reasons).length > 0;
      if (busy && !timer) {
        base = document.title; lastSet = null;
        timer = setInterval(frame, 110); frame();
      } else if (!busy && timer) {
        clearInterval(timer); timer = null;
        link.href = STATIC;
        if (document.title === lastSet) document.title = base;
      }
    };
    window.mrdTabBusy(true, 'MERIDIAM', 'start');
  })();
  </script>

  <script>
  /* ── MERIDIAM launchpad ─────────────────────────────────────────────── */
  (function () {
    var lp    = document.querySelector('[data-view="main"]');
    if (!lp) return;
    var q     = document.getElementById('mlpQ');
    var empty = document.getElementById('mlpEmpty');
    var tip   = document.getElementById('mlpTip');
    var tabs  = [].slice.call(document.querySelectorAll('#mlpTabs button'));
    var grps  = [].slice.call(lp.querySelectorAll('.mlp-grp'));
    var tiles = [].slice.call(lp.querySelectorAll('.mlp-tile'));
    var tab   = 'all';

    /* the one quiet line under the tabs */
    var today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('mlpScope').innerHTML =
      '<b>MERIDIAM</b><i>·</i>Static Equipment Intelligence<i>·</i><b>' + tiles.length +
      '</b> apps<i>·</i>' + today;

    function hostOpen() { return !!(window.mrdHost && window.mrdHost.open); }
    function visible() {
      return lp.style.display !== 'none' && !hostOpen();
    }

    function apply() {
      var s = q.value.trim().toLowerCase(), shown = 0;
      grps.forEach(function (g) {
        var inTab = tab === 'all' || g.dataset.g === tab, n = 0;
        g.querySelectorAll('.mlp-tile').forEach(function (t) {
          var hay = (t.dataset.k + ' ' + t.textContent).toLowerCase();
          var hit = !s || s.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
          t.hidden = !(hit && (inTab || s));
          if (!t.hidden) n++;
        });
        g.hidden = n === 0; shown += n;
      });
      empty.hidden = shown > 0;
      empty.querySelector('b').textContent = q.value.trim();
    }
    function replay() {
      if (!window.mrdAuthorOk()) { lp.classList.add('mlp-off'); return; }
      lp.querySelectorAll('.mlp-tiles').forEach(function (el, gi) {
        el.classList.remove('in'); void el.offsetWidth;
        [].forEach.call(el.children, function (t, i) { t.style.animationDelay = (gi * 90 + i * 45) + 'ms'; });
        el.classList.add('in');
      });
    }

    window.mlpGoTab = function (g) {
      tab = g || 'all';
      tabs.forEach(function (b) { b.classList.toggle('on', b.dataset.g === tab); });
      if (tab === 'all' && q.value) q.value = '';
      apply(); replay();
    };
    tabs.forEach(function (b) { b.addEventListener('click', function () { window.mlpGoTab(b.dataset.g); }); });
    q.addEventListener('input', apply);
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var first = tiles.filter(function (t) { return !t.hidden; })[0];
        if (first) first.click();
      } else if (e.key === 'Escape') { q.value = ''; apply(); q.blur(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || !visible()) return;
      var a = document.activeElement;
      if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
      e.preventDefault(); q.focus(); q.select();
    });

    /* opening an app */
    var OPEN = {
      drm:     function () { openEmbeddedApp('drm', 'Document Review Management'); },
      p6:      function () { openEmbeddedApp('p6', 'P6 PLAN4E Milestone Management'); },
      asme:    function () { openEmbeddedApp('asme', 'ASME Section VIII Division 1 Visualiser'); },
      ert:     function () {
        if (window.showModuleSplash) window.showModuleSplash('Engineering Review Tool');
        showView('home');
      },
      project: function () { openModule('project'); }
    };
    window.mlpOpen = function (key) { if (window.mrdAuthorOk() && OPEN[key]) OPEN[key](); };
    lp.classList.toggle('mlp-off', !window.mrdAuthorOk());
    tiles.forEach(function (t) {
      t.addEventListener('click', function () {
        hideTip();
        t.classList.add('go');
        setTimeout(function () { t.classList.remove('go'); window.mlpOpen(t.dataset.app); }, 110);
      });
    });

    /* what a tile is for, on hover */
    var tipT = null;
    function hideTip() { clearTimeout(tipT); tip.classList.remove('on'); }
    tiles.forEach(function (t) {
      t.addEventListener('mouseenter', function () {
        clearTimeout(tipT);
        tipT = setTimeout(function () {
          tip.querySelector('.t1').textContent = t.querySelector('.t').textContent;
          tip.querySelector('.t2').textContent = t.dataset.tip || '';
          var r = t.getBoundingClientRect(), w = 300;
          var x = r.right + 10, y = r.top + 14;
          if (x + w > window.innerWidth - 12) x = Math.max(12, r.left - w - 10);
          tip.style.left = x + 'px'; tip.style.top = y + 'px';
          tip.classList.add('on');
        }, 420);
      });
      t.addEventListener('mouseleave', hideTip);
    });
    lp.addEventListener('scroll', hideTip, { passive: true });

    /* Called by showView on every change of view: the tiles play in again
       when you come back to them, and the help button learns where you are. */
    window.mrdSuiteOnView = function (v) {
      hideTip();
      if (v === 'main' && !hostOpen()) replay();
      try { document.dispatchEvent(new CustomEvent('mrd:context')); } catch (e) {}
    };

    /* The Engineering Review Tool's logo leads back here too. */
    var hl = document.querySelector('[data-view="home"] .home-logo');
    if (hl) {
      hl.title = 'Back to all apps';
      hl.addEventListener('click', function () { showView('main'); });
    }

    /* The tiles play in once the opening presentation has gone. */
    var loader = document.getElementById('meridian-loader');
    function afterLoader(fn) {
      var t0 = Date.now();
      (function wait() {
        if (!loader || loader.classList.contains('loader-exit') || loader.style.display === 'none' ||
            Date.now() - t0 > 8000) fn();
        else setTimeout(wait, 120);
      })();
    }
    window.mrdAfterLoader = afterLoader;
    afterLoader(function () {
      if (window.mrdTabBusy) window.mrdTabBusy(false, '', 'start');
      if (visible()) replay();
    });
  })();
  </script>

  <script>
  /* ── Help ───────────────────────────────────────────────────────────── */
  (function () {
    var TO = 'upatel@tecnicasreunidas.es';
    var root   = document.getElementById('mhb');
    var fab    = document.getElementById('mhbFab');
    var panel  = document.getElementById('mhbPanel');
    var ctxEl  = document.getElementById('mhbCtx');
    var thread = document.getElementById('mhbThread');
    var dock   = document.getElementById('mhbDock');
    var qsEl   = document.getElementById('mhbQs');
    var miss   = document.getElementById('mhbMiss');
    var comp   = document.getElementById('mhbCompose');
    var ta     = document.getElementById('mhbText');
    var send   = document.getElementById('mhbSend');
    var count  = document.getElementById('mhbCount');
    var mailFr = document.getElementById('mhbMailFrame');
    if (!root) return;

    function k(s) { return '<span class="k">' + s + '</span>'; }

    /* Questions shared by every app, worded for where the way back is. */
    var FILES = { q: 'Do my files leave my computer?',
      a: 'No. Every file you load is read inside your browser and is never uploaded. Some apps fetch a ' +
         'spreadsheet library, fonts or the equation renderer from the internet as they open, so keep a connection.' };
    function back(how) { return { q: 'How do I get back to all apps?', a: how }; }
    var BACK_HOST = back('Press ' + k('All apps') + ' on the right of the MERIDIAM bar at the top, or click the ' +
      'MERIDIAM logo beside it. Whatever you had loaded in this app is closed, so download or save your work first.');

    var CTX = {
      main: { name: 'MERIDIAM launchpad', faq: [
        { q: 'What is MERIDIAM?',
          a: 'MERIDIAM is one file that holds every static-equipment tool: <b>Document Review Management</b>, ' +
             '<b>P6 PLAN4E Milestone Management</b>, the <b>ASME Section VIII Division 1 Visualiser</b>, the ' +
             '<b>Engineering Review Tool</b> and <b>Project Details</b>. Each tile on this page opens one app.' },
        { q: 'How do I open an app?',
          a: 'Click its tile. You can also type in ' + k('Search apps') + ' (press ' + k('/') + ' to jump there) and ' +
             'press ' + k('Enter') + ' to open the first match. The tabs above the tiles narrow the page to one group.' },
        { q: 'How do I come back to this page?',
          a: 'Every app opens under the MERIDIAM bar: press ' + k('All apps') + ' on its right, or click the MERIDIAM logo. ' +
             'In the Engineering Review Tool, use ' + k('All apps') + ' at the top right.' },
        FILES,
        { q: 'Where are my settings and lists saved?',
          a: 'In this browser on this computer — the engineer lists, the look-ahead, themes and your ASME progress. ' +
             'They are not shared with colleagues, and they are lost if you clear browsing data or open the file in another browser.' },
        { q: 'Which browser should I use?',
          a: 'Microsoft Edge or Google Chrome, kept up to date. Open the file straight from your disk. MERIDIAM goes full ' +
             'screen on your first click; press ' + k('Esc') + ' to leave full screen.' },
        { q: 'Where is the Revision & Tracking Tool?',
          a: 'It has been retired. Document status now lives in <b>Document Review Management</b>, and schedule progress in ' +
             '<b>P6 PLAN4E Milestone Management</b>.' }
      ]},

      drm: { name: 'Document Review Management', faq: [
        { q: 'Which file do I load?',
          a: 'The master <b>Consolidated Status</b> workbook (.xlsx). Drop it on the first page or click to browse. ' +
             'Large files take a few seconds — the percentage shows how far it has read.' },
        { q: 'How do I pick my department, discipline and PO?',
          a: 'After the file loads choose ' + k('1 · Originator Department') + ', ' + k('2 · Your Discipline') +
             ' (the column you review from) and ' + k('3 · Purchase Order') + ', then press ' + k('Check Status →') +
             '. To switch later, press ' + k('Change scope') + ' on the home page.' },
        { q: 'What is the difference between reviewing and managing?',
          a: k('I am reviewing') + ' shows the work itself: your review actions, documents waiting on others, those ready ' +
             'to release, and the client CRS. ' + k('I am managing') + ' looks across the whole purchase order: the ' +
             'overviews, planning (assign engineers, workload, check progress) and the reports.' },
        { q: 'How do I assign an engineer?',
          a: 'Switch to ' + k('I am managing') + ' and open ' + k('Assign engineers') + '. Pick a name against each tag, ' +
             'or against a single document. Engineers and their email addresses are kept under Settings — the gear at the top right.' },
        { q: 'How do I send a list to an engineer?',
          a: 'Open the list and press ' + k('Email this list') + '. Your email app opens a draft — addressed to the engineer ' +
             'when the engineer list has their address — and the table is copied, so press ' + k('Ctrl+V') +
             ' in Outlook to paste it. If a list is too long for a draft, use ' + k('Download as Excel') + ' and attach it.' },
        { q: 'How do I export to Excel or PDF?',
          a: 'Lists and reports carry a ' + k('Download as Excel') + ' button; the reports also offer ' +
             k('Print / save as PDF') + '.' },
        { q: 'How do I see what changed since the last export?',
          a: 'Under ' + k('I am managing') + ', open ' + k('Check progress') + ' and load the earlier export. It shows what moved between the two files.' },
        { q: 'The numbers do not look right',
          a: 'Check the line under the tabs — PO, department, discipline and the export date. If it is the wrong PO press ' +
             k('Change scope') + '; if the file is old press ' + k('Load another file') + '.' },
        FILES, BACK_HOST
      ]},

      p6: { name: 'P6 PLAN4E Milestone Management', faq: [
        { q: 'Which file do I load?',
          a: 'The <b>P6-PLAN4E</b> relation export (.xlsx) as it comes out of the system: five header lines, then the ' +
             'column names on row 6 — Family, Drawing Number, Milestone code, Milestone Weight, Planned, Forecast and Real Date, and the rest.' },
        { q: 'How is progress worked out?',
          a: 'By weight, not by count. A milestone is met when it has a Real Date. A document’s progress is the weight of its ' +
             'met milestones over the weight of all of them. The plan’s figure is earned hours over budget hours, so each ' +
             'document counts by its budget.' },
        { q: 'When is a milestone overdue?',
          a: 'When it has no Real Date and its Planned Date is before the export’s cut-off. The cut-off is the ' +
             k('Date/Hour') + ' in the file header, not today’s date on your computer.' },
        { q: 'What does “Coming up in N days” count?',
          a: 'Milestones not yet met whose expected date — the Forecast if there is one, otherwise the Planned date — falls ' +
             'inside the look-ahead. Change it with ' + k('Look ahead') + ' (7, 14, 30 or 60 days) on the home page; your choice is remembered.' },
        { q: 'How do I see every document?',
          a: 'Switch to ' + k('I am managing') + ' and open ' + k('Every document') + '. Toggle ' + k('To finish') + ', ' +
             k('Complete') + ' or ' + k('All') + '. Each row shows its milestone chain, the weight met, its progress and the milestone it is waiting on.' },
        { q: 'How do I assign the responsible engineer?',
          a: k('I am managing') + ' → ' + k('Responsible engineers') + '. Name an engineer for a whole family or for one ' +
             'document, then download the plan: the names are written into a RESPONSIBLE ENGINEER column and read back the next time you load that file.' },
        { q: 'What does “Returned with comments” mean?',
          a: 'Milestones whose client comment code is <b>AWC</b> — approved with comments — so the document needs another pass.' },
        { q: 'How do I send someone their list?',
          a: 'Open the list and press ' + k('Email this list') + '. A draft opens with the summary; attach the spreadsheet you download from the same page.' },
        FILES, BACK_HOST
      ]},

      asme: { name: 'ASME Section VIII Division 1 Visualiser', faq: [
        { q: 'What is this app?',
          a: 'A learning lab for ASME BPVC Section VIII Division 1, 2025 edition. Browse the code by Part and appendix in the ' +
             k('Library') + ', see how paragraphs connect on the ' + k('Map') + ', and work through the interactive ' + k('Modules') + '.' },
        { q: 'How do I find a paragraph?',
          a: 'Press ' + k('Ctrl K') + ' (or ' + k('/') + ') anywhere, or use the search on the Dashboard. Try “UG-27”, ' +
             '“hoop stress” or “joint efficiency”, then press ' + k('Enter') + '.' },
        { q: 'Which interactive modules are there?',
          a: 'Twelve: UG-27 shells under internal pressure, UG-32 formed heads, UG-28 external pressure, UG-37 opening ' +
             'reinforcement, UG-45 nozzle necks, UG-34 flat heads, UCS-66 MDMT and impact test exemption, UG-99 the pressure ' +
             'ladder, UW-12 joint efficiency and radiography, UG-16 thickness stack-up, UCS-56 PWHT and UG-22 loadings. ' +
             'Open ' + k('Modules') + ' in the top bar.' },
        { q: 'Can I switch between SI and US units?',
          a: 'Yes. In a module’s ' + k('Inputs') + ' panel choose ' + k('SI · MPa, mm') + ' or ' + k('US · psi, in') + '.' },
        { q: 'Can I use the results for design?',
          a: 'No. It is a learning aid: stress values are typical and assumed. Design to the current edition of the code and to your project’s approved values.' },
        { q: 'How do I switch between dark and light?',
          a: 'Use the moon / sun button at the top right. Your choice is remembered in this browser.' },
        { q: 'Is my learning progress saved?',
          a: 'Yes, in this browser. The ' + k('Path') + ' page shows the steps you have explored.' },
        BACK_HOST
      ]},

      home: { name: 'Engineering Review Tool', faq: [
        { q: 'How do I start a review?',
          a: 'Pick the equipment on the dock: Drum, Column, Reactor, Tank or Sphere. <b>Drum</b> and <b>Tank</b> open inside ' +
             'MERIDIAM; Column, Reactor and Sphere open their reviews on the MERIDIAM website, so you need an internet connection.' },
        { q: 'How do I start a new drum review?',
          a: 'Click the Drum, then ' + k('Create New Drum') + ' and choose ' + k('Vertical Drum') + ' or ' + k('Horizontal Drum') + '. Fill in the vessel details to begin.' },
        { q: 'How do I continue a drum review I saved?',
          a: 'Click the Drum, then ' + k('Existing Drum') + ', choose the Excel review file you saved earlier and press ' + k('Import') + '.' },
        { q: 'How do I review a storage tank?',
          a: 'Click the Tank. It opens the API 650 storage tank GAD review checklist with its 3D model. Use ' + k('Export') + ' to save your review.' },
        back('Press ' + k('All apps') + ' at the top right, or click the MERIDIAM logo at the top left.')
      ]},

      drum: { name: 'Engineering Review Tool · Drum', faq: [
        { q: 'How do I save my review?',
          a: 'Press ' + k('Save') + ' at the top left. It downloads the review as an Excel file; the status beside it ' +
             'reads “All changes saved” or “Unsaved changes”.' },
        { q: 'What if I close with unsaved changes?',
          a: 'The ' + k('×') + ' asks you to ' + k('Save & Close') + ', ' + k('Discard & Close') + ' or ' + k('Cancel') + ', so nothing is lost by accident.' },
        { q: 'How do I go back to the vessel details?',
          a: 'Use ' + k('← Edit Vessel') + ' at the top right.' },
        { q: 'How do I carry on with this review later?',
          a: 'Save it to Excel. Next time click the Drum → ' + k('Existing Drum') + ' and import that file.' },
        back('Close the review with ' + k('×') + ' at the top left (you are asked to save if anything changed), then press ' + k('All apps') + ' at the top right.')
      ]},

      tank: { name: 'Engineering Review Tool · Tank', faq: [
        { q: 'What does this checklist cover?',
          a: 'The API 650 storage tank general arrangement drawing review: the checklist items, with a 3D model of the tank beside them.' },
        { q: 'Is my tank review saved?',
          a: 'Not in the browser — press ' + k('Export') + ' to keep it as an Excel file, and import that workbook into the checklist to carry on later.' },
        { q: 'How do I use the 3D model?',
          a: 'Drag to turn it and scroll to zoom. ' + k('Cutaway') + ' shows the inside, ' + k('Auto-spin') + ' turns it slowly and ' + k('Reset view') + ' puts it back.' },
        back('Press ' + k('Engineering Review Tool') + ' on the right of the MERIDIAM bar to return to the dock, then ' + k('All apps') + '.')
      ]},

      project: { name: 'Project Details', faq: [
        { q: 'What is in Project Details?',
          a: 'The static equipment reference for <b>CEYHAN PDH-PP (10410)</b>: every pressure vessel, process column and the reactor ' +
             'across the plant units, with a plant location map, how equipment is classified, an explorer and the standards basis.' },
        { q: 'How do I find a piece of equipment?',
          a: 'In the ' + k('Equipment Explorer') + ', search by tag or purpose — for example “flare”, “01-D-1” or “guard bed” — ' +
             'or filter by typology, support and service. ' + k('Clear filters') + ' starts again.' },
        { q: 'How do I see one plant unit?',
          a: 'Click the unit on the ' + k('Plant Location Map') + '; the explorer opens filtered to it. Coloured units are in TR India scope.' },
        { q: 'Can another project be added?',
          a: 'Yes — projects are added to MERIDIAM centrally. Use “Your issue is not listed” below and name the project you need.' },
        BACK_HOST
      ]}
    };

    function ctxKey() {
      var h = window.mrdHost || {};
      if (h.open) {
        if (h.key === 'ceyhan' || h.key === 'project') return 'project';
        return CTX[h.key] ? h.key : 'main';
      }
      var v = (typeof SPA_STATE !== 'undefined' && SPA_STATE.currentView) || 'main';
      return CTX[v] ? v : 'main';
    }

    /* One conversation per app: coming back to an app brings back what was
       asked there, and nothing from elsewhere runs into it. */
    var cur = null, greeted = {}, convs = {};
    function conv() {
      if (!convs[cur]) {
        var c = document.createElement('div');
        c.className = 'mhb-conv'; c.dataset.c = cur;
        thread.appendChild(c); convs[cur] = c;
      }
      return convs[cur];
    }
    function showConv() {
      Object.keys(convs).forEach(function (k) { convs[k].hidden = k !== cur; });
      conv().hidden = false;
    }
    function scrollDown() { thread.scrollTop = thread.scrollHeight; }
    /* Utkarsh answers: his photo sits beside every reply, and beside the
       dots while he is typing. */
    var FACE = (document.querySelector('#mrd-pf-card .mrd-pf-img') || {}).src || '';
    var headFace = document.getElementById('mhbHeadFace');
    if (headFace && FACE) headFace.src = FACE;
    function face() {
      var i = document.createElement('img');
      i.className = 'mhb-face'; i.alt = ''; i.src = FACE;
      return i;
    }
    function row(inner) {
      var r = document.createElement('div');
      r.className = 'mhb-row';
      r.appendChild(face()); r.appendChild(inner);
      conv().appendChild(r); scrollDown();
      return r;
    }
    function bubble(cls, html) {
      var d = document.createElement('div');
      d.className = 'mhb-msg ' + cls; d.innerHTML = html;
      if (cls === 'bot') row(d); else { conv().appendChild(d); scrollDown(); }
      return d;
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function renderQs() {
      var c = CTX[cur];
      qsEl.innerHTML = '';
      c.faq.forEach(function (f) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'mhb-q';
        b.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" ' +
          'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/>' +
          '<path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.6-2.4 2.1-2.4 3.5M12 16.8h.01"/></svg><span></span>';
        b.querySelector('span').textContent = f.q;
        b.addEventListener('click', function () { ask(f, b); });
        qsEl.appendChild(b);
      });
    }
    function syncContext(force) {
      var key = ctxKey();
      root.classList.toggle('lift', key === 'asme');
      if (key === cur && !force) return;
      cur = key;
      ctxEl.textContent = 'You are in: ' + CTX[cur].name;
      renderQs();
      showConv();
      if (!comp.hidden) compose(false);
      if (!panel.hidden) { greet(); scrollDown(); }
    }
    function greet() {
      if (greeted[cur]) return;
      greeted[cur] = 1;
      bubble('bot', (Object.keys(greeted).length === 1 ? 'Hi! ' : '') +
        'You are in <b>' + esc(CTX[cur].name) + '</b>. Pick a question below — or, if yours is not there, ' +
        'choose <b>Your issue is not listed</b> and describe it.');
    }

    var busy = false;
    function ask(f, btn) {
      if (busy) return;
      busy = true;
      bubble('me', esc(f.q));
      var t = document.createElement('div');
      t.className = 'mhb-typing'; t.innerHTML = '<i></i><i></i><i></i>';
      var tr = null;
      setTimeout(function () { tr = row(t); }, 350);
      setTimeout(function () {
        if (tr) tr.remove();
        bubble('bot', f.a);
        if (btn) btn.classList.add('seen');
        busy = false;
      }, 3350);
    }

    /* opening and closing */
    function open() {
      syncContext();
      panel.hidden = false;
      root.classList.add('open'); root.classList.remove('hello');
      fab.setAttribute('aria-expanded', 'true');
      fab.setAttribute('aria-label', 'Close help');
      greet();
      setTimeout(scrollDown, 30);
    }
    function close() {
      panel.hidden = true;
      root.classList.remove('open');
      fab.setAttribute('aria-expanded', 'false');
      fab.setAttribute('aria-label', 'Help');
    }
    fab.addEventListener('click', function () { panel.hidden ? open() : close(); });
    document.getElementById('mhbClose').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { e.stopPropagation(); close(); fab.focus(); }
    }, true);
    document.addEventListener('mrd:context', function () { syncContext(); });

    /* Your issue is not listed */
    function compose(on) {
      comp.hidden = !on; dock.hidden = on;
      if (on) {
        bubble('bot', 'Tell us what went wrong in <b>' + esc(CTX[cur].name) + '</b> — what you were doing, what you ' +
          'expected, and what happened instead. When you press <b>Send</b>, your email app opens with your message ' +
          'ready, addressed to <b>' + TO + '</b>.');
        setTimeout(function () { ta.focus(); }, 60);
      }
    }
    miss.addEventListener('click', function () { bubble('me', 'My issue is not listed'); compose(true); });
    document.getElementById('mhbBack').addEventListener('click', function () { compose(false); });
    ta.addEventListener('input', function () {
      var n = ta.value.length;
      count.textContent = n + ' / 1500';
      send.hidden = !ta.value.trim();
    });

    function browser() {
      var u = navigator.userAgent, b = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /Chrome\//.test(u) ? 'Chrome'
            : /Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : 'Browser';
      var v = (u.match(/(?:Edg|OPR|Chrome|Firefox|Version)\/(\d+)/) || [])[1];
      var os = /Windows/.test(u) ? 'Windows' : /Mac OS/.test(u) ? 'macOS' : /Linux/.test(u) ? 'Linux' : '';
      return b + (v ? ' ' + v : '') + (os ? ' on ' + os : '');
    }
    function mailHref(text) {
      var c = CTX[cur];
      var subj = 'MERIDIAM Help — ' + c.name;
      var tail = '\n\n— — —\nApp: ' + c.name + '\nSent from: MERIDIAM Suite · Help' +
                 '\nDate: ' + new Date().toLocaleString('en-GB') + '\nBrowser: ' + browser();
      return 'mailto:' + TO + '?subject=' + encodeURIComponent(subj) +
             '&body=' + encodeURIComponent('Hello,\n\n' + text + tail);
    }
    function copy(text) {
      try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text); return; } } catch (e) {}
      var t = document.createElement('textarea');
      t.value = text; t.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (e) {}
      t.remove();
    }

    /* A long message would be cut short by the mail client, so the draft
       carries as much as fits and the whole text goes on the clipboard. */
    var LIMIT = 1900;
    send.addEventListener('click', function () {
      var text = ta.value.trim();
      if (!text) return;
      var href = mailHref(text), cut = false, shown = text;
      while (href.length > LIMIT && shown.length > 80) {
        shown = shown.slice(0, Math.floor(shown.length * 0.85));
        cut = true;
        href = mailHref(shown + '…\n\n[The full description is on your clipboard — paste it here.]');
      }
      if (cut) copy(text);
      /* Through a hidden frame, so the page itself never starts to unload —
         a review with unsaved changes would otherwise ask to leave. */
      try { mailFr.src = href; } catch (e) { location.href = href; }
      window.mrdHelpLastMail = href;

      bubble('me', esc(text).replace(/\n/g, '<br>'));
      var done = bubble('bot', 'Your email app is opening with this message addressed to <b>' + TO + '</b>. ' +
        'Press <b>Send</b> in Outlook to deliver it.' +
        (cut ? ' Your description was long, so the full text is also on your clipboard — paste it into the email.' : '') +
        '<div class="acts"><button type="button" data-a="again">Open the email again</button>' +
        '<button type="button" data-a="copy">Copy my message</button></div>');
      done.querySelector('[data-a="again"]').addEventListener('click', function () { mailFr.src = 'about:blank'; setTimeout(function () { mailFr.src = href; }, 30); });
      done.querySelector('[data-a="copy"]').addEventListener('click', function (e) {
        copy(text); e.target.textContent = 'Copied';
      });
      ta.value = ''; count.textContent = '0 / 1500'; send.hidden = true;
      compose(false);
    });

    /* Shown once the opening presentation has gone, with one slow ring. */
    syncContext(true);
    (window.mrdAfterLoader || function (fn) { fn(); })(function () {
      root.classList.add('ready', 'hello');
      setTimeout(function () { root.classList.remove('hello'); }, 3400);
    });
  })();
  </script>
