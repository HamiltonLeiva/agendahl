import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const leadsBody = document.getElementById('leads-body');
const leadModal = document.getElementById('lead-modal');
const closeLeadModal = document.getElementById('close-lead-modal');

let conversionChart = null;

export function initLeadsListener() {
    const q = query(collection(window.db, "leads"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        const leads = [];
        snapshot.forEach((doc) => {
            leads.push({ id: doc.id, ...doc.data() });
        });
        renderLeads(leads);
        updateStats(leads);
        renderChart(leads);
    });

    closeLeadModal?.addEventListener('click', () => {
        leadModal.style.display = 'none';
    });
}

function renderLeads(leads) {
    if (!leadsBody) return;
    leadsBody.innerHTML = '';
    
    leads.forEach(lead => {
        const row = document.createElement('tr');
        row.className = 'lead-row';
        
        const statusColor = getStatusColor(lead.status);
        const divisionTag = getDivisionTag(lead.division);

        row.innerHTML = `
            <td><strong>${lead.name || 'N/D'}</strong><br><small style="color:var(--text-secondary)">${lead.contact || ''}</small></td>
            <td>${divisionTag}</td>
            <td><span class="status-pill" style="background: ${statusColor.bg}; color: ${statusColor.text};">${lead.status || 'Nuevo'}</span></td>
            <td>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <select class="status-select ai-input" data-id="${lead.id}" style="padding: 2px 5px; font-size: 0.7rem;">
                        <option value="Nuevo" ${lead.status === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
                        <option value="Contactado" ${lead.status === 'Contactado' ? 'selected' : ''}>Contactado</option>
                        <option value="En Negociación" ${lead.status === 'En Negociación' ? 'selected' : ''}>Negociación</option>
                        <option value="Cerrado" ${lead.status === 'Cerrado' ? 'selected' : ''}>Cerrado</option>
                    </select>
                    <button class="view-details" data-id="${lead.id}" style="background:none; border:none; color: var(--accent-cyan); cursor:pointer; font-size: 0.7rem; font-weight: 700;">DETALLES</button>
                </div>
            </td>
        `;
        leadsBody.appendChild(row);
    });

    // Event listeners
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            await updateLeadStatus(id, e.target.value);
        });
    });

    document.querySelectorAll('.view-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const lead = leads.find(l => l.id === id);
            if (lead) showLeadModal(lead);
        });
    });
}

function showLeadModal(lead) {
    document.getElementById('modal-lead-name').textContent = lead.name || 'N/D';
    document.getElementById('modal-lead-contact').textContent = lead.contact || 'N/D';
    document.getElementById('modal-lead-division').textContent = lead.division || 'General';
    document.getElementById('modal-lead-date').textContent = lead.timestamp ? new Date(lead.timestamp).toLocaleString() : 'N/D';
    document.getElementById('modal-lead-message').textContent = lead.message || 'Sin mensaje adicional.';
    leadModal.style.display = 'flex';
}

async function updateLeadStatus(id, status) {
    const leadRef = doc(window.db, "leads", id);
    try {
        await updateDoc(leadRef, { status });
    } catch (e) {
        console.error("Error actualizando estado:", e);
    }
}

function getStatusColor(status) {
    switch(status) {
        case 'Nuevo': return { bg: 'rgba(0, 247, 255, 0.1)', text: 'var(--accent-cyan)' };
        case 'Contactado': return { bg: 'rgba(255, 191, 36, 0.1)', text: 'var(--accent-gold)' };
        case 'En Negociación': return { bg: 'rgba(112, 0, 255, 0.1)', text: 'var(--accent-purple)' };
        case 'Cerrado': return { bg: 'rgba(0, 255, 127, 0.1)', text: '#00ff7f' };
        default: return { bg: 'rgba(255, 255, 255, 0.1)', text: 'var(--text-secondary)' };
    }
}

function getDivisionTag(division) {
    const d = division?.toLowerCase() || 'general';
    if (d.includes('solutions')) return '<span class="division-tag tag-cyan">Solutions</span>';
    if (d.includes('software')) return '<span class="division-tag tag-purple">Software</span>';
    if (d.includes('app')) return '<span class="division-tag tag-gold">App</span>';
    if (d.includes('media')) return '<span class="division-tag tag-pink">Media</span>';
    return '<span class="division-tag" style="background:rgba(255,255,255,0.05)">General</span>';
}

function updateStats(leads) {
    const totalLeads = leads.length;
    const closed = leads.filter(l => l.status === 'Cerrado').length;
    const conversion = totalLeads > 0 ? Math.round((closed / totalLeads) * 100) : 0;

    document.getElementById('stat-total').textContent = totalLeads;
    document.getElementById('stat-conversion').textContent = conversion + '%';
}

function renderChart(leads) {
    const ctx = document.getElementById('conversionChart');
    if (!ctx) return;

    const divisions = ['Solutions', 'Software', 'App', 'Media'];
    const data = divisions.map(div => leads.filter(l => l.division?.includes(div)).length);

    if (conversionChart) {
        conversionChart.data.datasets[0].data = data;
        conversionChart.update();
    } else {
        conversionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: divisions,
                datasets: [{
                    label: 'Prospectos por División',
                    data: data,
                    backgroundColor: [
                        'rgba(0, 247, 255, 0.5)',
                        'rgba(112, 0, 255, 0.5)',
                        'rgba(251, 191, 36, 0.5)',
                        'rgba(255, 0, 127, 0.5)'
                    ],
                    borderColor: [
                        '#00f7ff',
                        '#7000ff',
                        '#fbbf24',
                        '#ff007f'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}
