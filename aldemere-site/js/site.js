/* Conquest of Aldemere, project site. Small helpers: forms, copy button, lightbox.
   Everything the owner may need to change is in SITE below. */
var SITE = {
  // Paste a form endpoint here (Formspree, Web3Forms, Getform...). Until then the forms tell
  // the visitor to write by email instead of pretending to send.
  formEndpoint: '',
  // The address is stored in two pieces so it is not sitting in the page text for scrapers.
  mailUser: 'yasserchettour02',
  mailHost: 'gmail.com'
};

(function () {
  'use strict';
  var email = SITE.mailUser + '@' + SITE.mailHost;

  document.querySelectorAll('[data-email]').forEach(function (el) { el.textContent = email; });
  document.querySelectorAll('[data-mailto]').forEach(function (a) { a.href = 'mailto:' + email; });

  document.querySelectorAll('.copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); };
      var pick = function () {
        var code = document.querySelector('[data-email]'); if (!code) return;
        var r = document.createRange(); r.selectNodeContents(code);
        var s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected';
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(email).then(done, pick); else pick();
    });
  });

  document.querySelectorAll('form.scroll').forEach(function (form) {
    var note = form.querySelector('.form-note');
    var say = function (text, kind) { note.textContent = text; note.className = 'form-note' + (kind ? ' ' + kind : ''); };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.querySelector('.trap input').value) return;             // a bot filled the hidden field
      var msg = form.querySelector('textarea');
      if (msg.value.trim().length < 5) { say('Write a few words first.', 'bad'); msg.focus(); return; }
      if (!SITE.formEndpoint) { say('This form is not connected yet. Please write to ' + email + ' for now.', 'bad'); return; }
      say('Sending...');
      var data = new FormData(form); data.append('_subject', 'Aldemere site: ' + form.dataset.kind);
      fetch(SITE.formEndpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); say('Received. Thank you. I read everything.', 'good'); })
        .catch(function () { say('That did not go through. Please write to ' + email + ' instead.', 'bad'); });
    });
  });

  var box = document.getElementById('lightbox');
  if (box && box.showModal) {
    var big = box.querySelector('img'), cap = box.querySelector('.cap');
    document.querySelectorAll('.shot').forEach(function (s) {
      s.addEventListener('click', function () {
        big.src = s.dataset.full; big.alt = s.dataset.title; cap.textContent = s.dataset.title; box.showModal();
      });
    });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
  }
})();
