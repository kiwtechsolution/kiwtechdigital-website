(function () {
  var AGENT_NAMES = ["Priya","Neha","Ananya","Riya","Simran","Kavya","Isha","Meera","Tanvi","Pooja"];
  var agentName = sessionStorage.getItem('kwtd_agent');
  if (!agentName) {
    agentName = AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];
    sessionStorage.setItem('kwtd_agent', agentName);
  }

  var history = [];
  try { history = JSON.parse(sessionStorage.getItem('kwtd_chat_history') || '[]'); } catch (e) { history = []; }

  var btn = document.getElementById('chatToggle');
  var panel = document.getElementById('chatPanel');
  var body = document.getElementById('chatBody');
  var input = document.getElementById('chatInput');
  var sendBtn = document.getElementById('chatSend');
  var nameEl = document.getElementById('chatAgentName');
  var avatarEl = document.getElementById('chatAvatar');

  nameEl.textContent = agentName;
  avatarEl.textContent = agentName.charAt(0);

  function addMsg(role, text) {
    var div = document.createElement('div');
    div.className = 'chat-msg ' + (role === 'user' ? 'chat-msg-user' : 'chat-msg-bot');
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function addWhatsappBtn(number, lastText) {
    var a = document.createElement('a');
    a.href = 'https://wa.me/' + number + '?text=' + encodeURIComponent('Hi, I want to know more about Kiwtech Digital services.');
    a.target = '_blank'; a.rel = 'noopener';
    a.className = 'chat-wa-btn';
    a.textContent = '💬 Continue on WhatsApp';
    body.appendChild(a);
    body.scrollTop = body.scrollHeight;
  }

  function save() {
    sessionStorage.setItem('kwtd_chat_history', JSON.stringify(history.slice(-20)));
  }

  function restoreHistory() {
    if (history.length === 0) {
      var greet = "Hi! I'm " + agentName + " from Kiwtech Digital 👋 We're a 360° digital marketing agency — Branding, Websites, SEO, Google & Meta Ads, and Business Consulting, all under one roof. Tell me a bit about your business and I'll guide you on what'll work best!";
      addMsg('assistant', greet);
      history.push({ role: 'assistant', content: greet });
      save();
    } else {
      history.forEach(function (m) { addMsg(m.role === 'user' ? 'user' : 'assistant', m.content); });
    }
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'chat-msg chat-msg-bot chat-typing';
    div.id = 'chatTyping';
    div.textContent = agentName + ' is typing...';
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }
  function hideTyping() {
    var t = document.getElementById('chatTyping');
    if (t) t.remove();
  }

  function sendMessage() {
    var text = input.value.trim();
    if (!text) return;
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    save();
    input.value = '';
    showTyping();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, agentName: agentName })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        hideTyping();
        addMsg('assistant', d.reply || "Could you tell me a bit more?");
        history.push({ role: 'assistant', content: d.reply || '' });
        save();
        if (d.wants_whatsapp) addWhatsappBtn(d.whatsappNumber || '919811506015', text);
      })
      .catch(function () {
        hideTyping();
        addMsg('assistant', "Sorry, facing a small issue on my end — please WhatsApp us directly and we'll help right away!");
      });
  }

  btn.addEventListener('click', function () {
    panel.classList.toggle('open');
    if (panel.classList.contains('open') && !body.hasChildNodes()) restoreHistory();
  });
  document.getElementById('chatClose').addEventListener('click', function () { panel.classList.remove('open'); });
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendMessage(); });
})();
