// Mobile menu
function toggleMenu() {
  const nav = document.querySelector('.nav-links');
  nav.classList.toggle('open');
}

// Catalog filter
function filterCatalog(cat, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('.product-card').forEach(card => {
    if (cat === 'all' || card.dataset.cat === cat) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
}

// Contact form
async function submitForm(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    subject: form.subject.value.trim(),
    message: form.message.value.trim(),
  };

  if (!payload.name || !payload.email || !payload.subject || !payload.message) {
    return alert('Заповніть усі поля форми');
  }

  try {
    const res = await fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Помилка відправки');
    }

    form.style.display = 'none';
    document.getElementById('formSuccess').classList.add('visible');
  } catch (err) {
    alert('Не вдалося надіслати повідомлення: ' + err.message);
  }
}

// Animate on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.addEventListener('DOMContentLoaded', () => {
  const animEls = document.querySelectorAll('.card, .product-card, .article-card, .team-card, .cat-card');
  animEls.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.4s ease ${i * 0.05}s, transform 0.4s ease ${i * 0.05}s, border-color 0.3s`;
    observer.observe(el);
  });

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', submitForm);
  }
});

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownToHtml(raw) {
  if (!raw) return '';
  let text = escapeHtml(raw);
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  const lines = text.split(/\r?\n/);
  let html = '';
  let tableRows = [];
  const flushTable = () => {
    if (!tableRows.length) return;
    html += '<table><tbody>' + tableRows.map(row => {
      const cells = row.split('|').filter(Boolean).map(cell => cell.trim());
      return '<tr>' + cells.map(cell => '<td>' + cell + '</td>').join('') + '</tr>';
    }).join('') + '</tbody></table>';
    tableRows = [];
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const isTableRow = /^\|.*\|$/.test(line);
    const isSeparator = /^\|?\s*-{3,}\s*(\|\s*-{3,}\s*)+\|?$/.test(line);
    if (isTableRow) {
      if (lines[i + 1] && /^\|?\s*-{3,}\s*(\|\s*-{3,}\s*)+\|?$/.test(lines[i + 1])) {
        tableRows.push(line);
        i += 1;
        continue;
      }
      tableRows.push(line);
      continue;
    }
    if (isSeparator) {
      continue;
    }
    if (tableRows.length) {
      flushTable();
    }
    if (!line.trim()) {
      html += '<p></p>';
    } else {
      html += '<p>' + line.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;') + '</p>';
    }
  }
  flushTable();
  return html;
}
