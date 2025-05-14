// Fungsi untuk menampilkan tab
function showTab(tabId, element) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    const tabButtons = document.querySelectorAll('.nav-tab');
    tabButtons.forEach(button => {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
    });
    if (element) {
        element.classList.add('active');
        element.setAttribute('aria-selected', 'true');
    }

    const tabInfos = document.querySelectorAll('.tab-info');
    tabInfos.forEach(info => info.style.display = 'none');
    document.getElementById(`${tabId}-info`).style.display = 'block';
}

// Fungsi untuk menyalin teks ke clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        const toast = document.getElementById('toast');
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 2000);
    } catch (err) {
        console.error('Gagal menyalin:', err);
        window.Swal.fire({
            title: 'Gagal Menyalin!',
            text: 'Mohon maaf atas ketidaknyamanan ini. Silakan salin manual!',
            html: `
                <p class="swal2-text-custom">Mohon maaf atas ketidaknyamanan ini. Silakan salin manual!</p>
                <div class="swal2-copyable-text">${text}</div>
            `,
            icon: 'error',
            iconColor: 'linear-gradient(to right, #8a2be2, #ff55bb)',
            confirmButtonText: 'Tutup',
            confirmButtonColor: '#8a2be2',
            background: 'linear-gradient(135deg, rgba(25, 25, 40, 0.9), rgba(35, 35, 55, 0.9))',
            customClass: {
                popup: 'swal2-custom',
                title: 'swal2-title-custom',
                confirmButton: 'swal2-confirm-custom'
            },
            showConfirmButton: true,
            allowOutsideClick: false,
            allowEscapeKey: false
        });
    }
}

// Array untuk menyimpan metode pembayaran dari data.json
let paymentMethods = [];

// Fungsi untuk mengambil nilai cookie berdasarkan nama
function getCookie(name) {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.split('=');
        if (cookieName === name) return decodeURIComponent(cookieValue);
    }
    return null;
}

// Fungsi untuk mengambil data dari /data.json dan mengubahnya ke format paymentMethods
async function fetchData() {
    try {
        // Update loading message
        const infoPanelH2 = document.querySelector('.info-panel h2');
        const infoPanelP = document.querySelector('.info-panel p');
        if (infoPanelH2) infoPanelH2.textContent = 'Data Sedang Dimuat';
        if (infoPanelP) infoPanelP.style.display = 'block';

        // Ambil passwordHash dari cookie
        let passwordHash = getCookie('passwordHash');
        if (!passwordHash) {
            passwordHash = "Hello, World!"; // Nilai default jika keadaan web tidak terenkripsi
        }

        // Lakukan fetch dengan metode POST dan body
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: passwordHash }),
        });

        if (!response.ok) throw new Error('Gagal mengambil data');

        const data = await response.json();

        // Ubah data.json ke format paymentMethods
        paymentMethods = [];

        // Tambahkan metode pembayaran dari data.json
        Object.keys(data).forEach(key => {
            const method = data[key];
            // Generalisasi nama dan judul berdasarkan kunci
            const displayName = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
            const displayTitle = `${displayName} Tersedia`;

            paymentMethods.push({
                id: key.toLowerCase(), // Ubah ke lowercase untuk konsistensi ID
                name: displayName,
                title: displayTitle,
                type: method.type, // Simpan tipe (number atau link)
                description: method.description,
                info: method.info,
                items: method.accounts.map(account => ({
                    name: account.name,
                    number: account.number,
                    owner: account.owner,
                    url: account.url // Untuk tipe link
                }))
            });
        });

        // Reset loading message
        if (infoPanelH2) infoPanelH2.textContent = 'Informasi';
        if (infoPanelP) infoPanelP.style.display = 'none';

    } catch (error) {
        console.error('Gagal memuat data:', error);
        const header = document.querySelector('.header');
        if (header) {
            header.querySelector('.emoji').textContent = '🙏';
            header.querySelector('h1').textContent = 'Mohon Maaf atas Kesalahan Ini';
            const h2 = header.querySelector('h2');
            if (h2) h2.style.display = 'none';
        }

        document.querySelectorAll('.nav-tabs, .info-panel, #tab-content-container, footer').forEach(el => {
            if (el) el.style.display = 'none';
        });
    }
}

// Fungsi untuk merender tab navigasi
function renderNavTabs() {
    const navTabsContainer = document.getElementById('nav-tabs-container');
    navTabsContainer.innerHTML = ''; // Kosongkan kontainer

    paymentMethods.forEach(method => {
        const tab = document.createElement('div');
        tab.className = 'nav-tab';
        tab.role = 'tab';
        tab.setAttribute('aria-selected', paymentMethods.indexOf(method) === 0 ? 'true' : 'false');
        tab.setAttribute('aria-controls', method.id);
        tab.tabIndex = 0;
        tab.textContent = method.name;
        tab.onclick = () => showTab(method.id, tab);
        tab.onkeydown = (event) => {
            if (event.key === 'Enter') showTab(method.id, tab);
        };
        if (paymentMethods.indexOf(method) === 0) tab.classList.add('active'); // Aktifkan tab pertama
        navTabsContainer.appendChild(tab);
    });
}

// Fungsi untuk merender info panel
function renderInfoTabs() {
    const tabInfoContainer = document.getElementById('tab-info-container');
    tabInfoContainer.innerHTML = ''; // Kosongkan kontainer

    paymentMethods.forEach(method => {
        const infoTab = document.createElement('div');
        infoTab.id = `${method.id}-info`;
        infoTab.className = 'tab-info';
        infoTab.style.display = paymentMethods.indexOf(method) === 0 ? 'block' : 'none'; // Tampilkan info pertama

        method.info.forEach((note, index) => {
            let noteText = note;
            // Ganti semua teks dengan panjang > 5 menjadi copyable
            noteText = noteText.replace(/\b(\d{6,})\b/g, match =>
                `<span class="phone-number" onclick="copyToClipboard('${match}')">${match}</span>`
            );
            infoTab.innerHTML += `
                <div class="note">
                    <span class="note-number">${index + 1}</span>
                    <p>${noteText.replace(/\n/g, "<br>")}</p>
                </div>
            `;
        });

        tabInfoContainer.appendChild(infoTab);
    });
}

// Fungsi untuk merender konten tab
function renderContent() {
    const contentContainer = document.getElementById('tab-content-container');
    contentContainer.innerHTML = ''; // Kosongkan kontainer

    paymentMethods.forEach(method => {
        const content = document.createElement('div');
        content.id = method.id;
        content.className = 'tab-content';
        if (paymentMethods.indexOf(method) === 0) content.classList.add('active'); // Aktifkan konten pertama

        const section = document.createElement('div');
        section.className = 'content-section';

        // Tambahkan judul
        const title = document.createElement('h3');
        title.textContent = method.title;
        section.appendChild(title);

        // Tambahkan description di bawah judul
        if (method.description) {
            const description = document.createElement('p');
            description.className = 'description';
            description.textContent = method.description;
            section.appendChild(description);
        }

        // Tambahkan grid kartu berdasarkan tipe
        const grid = document.createElement('div');
        // Gunakan card-grid hanya untuk tipe "number"
        grid.className = method.type === 'number' ? 'card-grid' : '';
        grid.id = `${method.id}-list`; // Generalisasi ID

        method.items.forEach(item => {
            const card = document.createElement('div');
            // Pilih tipe kartu berdasarkan method.type
            card.className = method.type === 'number' ? 'number-type-card' : 'link-type-card';
            if (method.type === 'link' && item.url) {
                card.innerHTML = `
                    <h4>${item.name}</h4>
                    <div class="donation-link">
                        <a href="${item.url}" target="_blank">${item.url}</a>
                        <button class="open-btn" onclick="window.open('${item.url}', '_blank')">Buka</button>
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <h4>${item.name}</h4>
                    <div class="number-container">
                        <div class="number">${item.number || ''}</div>
                        <button class="copy-btn" onclick="copyToClipboard('${item.number || ''}')">Salin</button>
                    </div>
                    <p class="owner">a.n. ${item.owner || ''}</p>
                `;
            }
            grid.appendChild(card);
        });

        section.appendChild(grid);
        content.appendChild(section);
        contentContainer.appendChild(content);
    });
}

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', async () => {
    // Mengatur tahun dinamis di footer
    document.getElementById('copyright').textContent = `© ${new Date().getFullYear()} Muhammad Zulfa Fauzan Nurhuda`;

    // Ambil data dan render
    await fetchData();
    if (paymentMethods.length > 0) {
        // Render tab, info, dan konten setelah data berhasil dimuat
        renderNavTabs();
        renderInfoTabs();
        renderContent();
    }
});