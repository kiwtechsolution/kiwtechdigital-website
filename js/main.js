document.addEventListener('DOMContentLoaded', function () {
  var yearEl = document.getElementById('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
  }

  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); } });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else { revealEls.forEach(function (el) { el.classList.add('in'); }); }

  var form = document.getElementById('contactForm');
  var note = document.getElementById('formNote');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var payload = {
        name: data.get('name'),
        phone: data.get('phone'),
        email: data.get('email'),
        service: data.get('service'),
        message: data.get('message')
      };
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
      fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function () {
          if (note) note.textContent = "Thanks! We've received your enquiry and will reach out shortly — or WhatsApp us directly for a faster reply.";
          form.reset();
        })
        .catch(function () {
          if (note) note.textContent = "Something went wrong sending this. Please WhatsApp us directly instead.";
        })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.textContent = 'Send Enquiry'; }
        });
    });
  }

  // Keep WhatsApp / call links in sync with the number set in Admin
  fetch('/api/whatsapp').then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (d) {
    if (!d || !d.number) return;
    document.querySelectorAll('.wa-link').forEach(function (a) {
      var text = a.textContent;
      a.href = 'https://wa.me/' + d.number;
    });
    document.querySelectorAll('.tel-link').forEach(function (a) {
      a.href = 'tel:+' + d.number;
    });
  }).catch(function () {});
});
