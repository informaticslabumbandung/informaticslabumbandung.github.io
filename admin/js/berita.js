// Berita Module - JavaScript untuk halaman berita.html

class BeritaManager {
    constructor() {
        this.api = window.gsAPI;
        this.tableBody = document.querySelector('#beritaTable tbody') || 
                        document.querySelector('.table-responsive tbody');
        this.cardsContainer = document.querySelector('#beritaCards') || 
                             document.querySelector('.row.g-4');
    }

    // Inisialisasi modul berita
    async init() {
        await this.loadBeritaData();
        this.setupEventListeners();
    }

    // Memuat data berita dari Google Sheets
    async loadBeritaData() {
        try {
            const beritaData = await this.api.loadData('berita');
            // Filter out rows with only timestamp (empty data rows from failed adds)
            const validData = beritaData.filter(item => 
                item['Judul Berita'] || item.judulBerita || item['Isi Berita'] || item.isiBerita
            );
            this.beritaData = validData.map(item => this.mapBeritaData(item));
            this.renderBeritaData(this.beritaData);
            this.updateStats(this.beritaData);
        } catch (error) {
            console.error('Error loading berita data:', error);
            this.api.showError('Gagal memuat data berita');
        }
    }

    // Map API fields to expected fields (matching exact Google Sheet headers)
    mapBeritaData(item) {
        return {
            id: item.id || item['ID Berita'] || item.iDBerita,
            rowId: item.rowId,
            judul: item['Judul Berita'] || item.judulBerita,
            konten: item['Isi Berita'] || item.isiBerita,
            gambar: item['Link Gambar'] || item.linkGambar,
            tanggal: item['Tanggal'] || item.tanggal,
            status: item['Status'] || item.status,
            dilihat: item['Dilihat'] || item.dilihat || item.views || 0
        };
    }

    // Render data berita ke tabel dan cards
    renderBeritaData(data) {
        // Render tabel
        if (this.tableBody) {
            this.renderTableData(data);
        }

        // Render cards (jika ada)
        if (this.cardsContainer) {
            this.renderCardsData(data);
        }
    }

    // Render data ke tabel (data already mapped)
    renderTableData(data) {
        if (!this.tableBody) return;

        this.tableBody.innerHTML = '';
        
        const mappedData = data; // already mapped in loadBeritaData

        mappedData.forEach((berita, index) => {
            const row = document.createElement('tr');
            
            const statusClass = this.api.getStatusBadgeClass(berita.status);
            const statusText = berita.status || 'Draft';

            row.innerHTML = `
                <td>${berita.id || `BR-${String(index + 1).padStart(3, '0')}`}</td>
                <td>${berita.judul || 'Judul belum ditentukan'}</td>
                <td>${this.api.formatDate(berita.tanggal) || 'Tanggal tidak tersedia'}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${berita.dilihat || 0}</td>
                <td>
                    <button class="btn btn-sm btn-action btn-preview me-1" title="Preview" onclick="beritaManager.previewBerita(${index})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-action btn-edit me-1" title="Edit" onclick="beritaManager.editBerita(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-action btn-delete" title="Hapus" onclick="beritaManager.deleteBerita(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            this.tableBody.appendChild(row);
        });

        // Inisialisasi DataTables jika tersedia
        if (window.$ && $.fn.DataTable) {
            if ($.fn.DataTable.isDataTable('#beritaTable')) {
                $('#beritaTable').DataTable().destroy();
            }
            
            $('#beritaTable').DataTable({
                "order": [[2, "desc"]],
                "language": {
                    "search": "Cari:",
                    "lengthMenu": "Tampilkan _MENU_ data",
                    "info": "Menampilkan _START_ hingga _END_ dari _TOTAL_ data"
                }
            });
        }
    }

    // Render data ke cards
    renderCardsData(data) {
        if (!this.cardsContainer) return;

        this.cardsContainer.innerHTML = '';
        
        const mappedData = data.map(item => this.mapBeritaData(item));

        mappedData.forEach((berita, index) => {
            const statusClass = berita.status === 'published' ? 'badge-published' : 
                              berita.status === 'draft' ? 'badge-draft' : 'badge-archived';
            
            const imageUrl = berita.gambar || 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400&h=200&fit=crop';

            const card = document.createElement('div');
            card.className = 'col-md-4';
            card.innerHTML = `
                <div class="card-berita">
                    <img src="${imageUrl}" 
                         alt="${berita.judul || 'Berita'}"
                         onerror="this.src='https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400&h=200&fit=crop'">
                    <div class="card-body-berita">
                        <div class="card-date-berita">
                            <i class="far fa-calendar me-1"></i> 
                            ${this.api.formatDate(berita.tanggal) || 'Tanggal tidak tersedia'}
                        </div>
                        <h6 class="card-title-berita">${berita.judul || 'Judul belum ditentukan'}</h6>
                        <span class="badge-status ${statusClass}">${berita.status || 'Draft'}</span>
                        <div class="mt-3 d-flex gap-2">
                            <button class="btn btn-sm btn-action btn-preview" title="Preview" onclick="beritaManager.previewBerita(${index})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-action btn-edit" title="Edit" onclick="beritaManager.editBerita(${index})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-action btn-delete" title="Hapus" onclick="beritaManager.deleteBerita(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            this.cardsContainer.appendChild(card);
        });
    }

    // Update statistik berita
    updateStats(data) {
        const mappedData = data.map(item => this.mapBeritaData(item));
        
        const totalBerita = mappedData.length;
        const totalPublished = mappedData.filter(b => b.status === 'published').length;
        const totalDraft = mappedData.filter(b => b.status === 'draft').length;
        const totalArchived = mappedData.filter(b => b.status === 'archived').length;

        // Update elemen statistik jika ada
        const elements = {
            totalBerita: document.getElementById('totalBerita'),
            totalPublished: document.getElementById('totalPublished'),
            totalDraft: document.getElementById('totalDraft'),
            totalArchived: document.getElementById('totalArchived')
        };

        if (elements.totalBerita) elements.totalBerita.textContent = totalBerita;
        if (elements.totalPublished) elements.totalPublished.textContent = totalPublished;
        if (elements.totalDraft) elements.totalDraft.textContent = totalDraft;
        if (elements.totalArchived) elements.totalArchived.textContent = totalArchived;
    }

    // Preview berita
    previewBerita(index) {
        const data = this.getCurrentDataSync();
        if (!data || !data[index]) return;

        const berita = this.mapBeritaData(data[index]);
        
        Swal.fire({
            title: `Preview: ${berita.judul}`,
            html: `
                <div class="text-start">
                    <p><strong>ID:</strong> ${berita.id || 'Tidak tersedia'}</p>
                    <p><strong>Tanggal:</strong> ${this.api.formatDate(berita.tanggal)}</p>
                    <p><strong>Status:</strong> <span class="badge ${this.api.getStatusBadgeClass(berita.status)}">${berita.status}</span></p>
                    <p><strong>Dilihat:</strong> ${berita.dilihat || 0} kali</p>
                    <hr>
                    <h6>Konten:</h6>
                    <div class="border rounded p-3 bg-light" style="max-height: 200px; overflow-y: auto;">
                        ${berita.konten || 'Konten tidak tersedia'}
                    </div>
                </div>
            `,
            confirmButtonColor: '#002d5d',
            confirmButtonText: 'Tutup',
            width: '700px'
        });
    }

    // Edit berita
    editBerita(index) {
        const data = this.getCurrentDataSync();
        if (!data || !data[index]) return;

        const berita = this.mapBeritaData(data[index]);
        
        Swal.fire({
            title: 'Edit Berita',
            html: `
                <div class="text-start">
                    <div class="mb-3">
                        <label class="form-label">Judul</label>
                        <input type="text" id="editJudul" class="form-control" value="${berita.judul || ''}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Konten</label>
                        <textarea id="editKonten" class="form-control" rows="5">${berita.konten || ''}</textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Status</label>
                        <select id="editStatus" class="form-select">
                            <option value="draft"${berita.status === 'draft' ? ' selected' : ''}>Draft</option>
                            <option value="published"${berita.status === 'published' ? ' selected' : ''}>Published</option>
                            <option value="archived"${berita.status === 'archived' ? ' selected' : ''}>Archived</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Tanggal</label>
                        <input type="date" id="editTanggal" class="form-control" value="${berita.tanggal ? berita.tanggal.split('T')[0] : ''}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">URL Gambar</label>
                        <input type="url" id="editGambar" class="form-control" value="${berita.gambar || ''}">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#002d5d',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal',
            preConfirm: async () => {
                const judul = document.getElementById('editJudul').value;
                const konten = document.getElementById('editKonten').value;
                const status = document.getElementById('editStatus').value;
                const tanggal = document.getElementById('editTanggal').value;
                const gambar = document.getElementById('editGambar').value;

                if (!judul.trim() || !konten.trim()) {
                    Swal.showValidationMessage('Judul dan Konten tidak boleh kosong');
                    return false;
                }

                // Simpan ke Google Sheets
                const success = await this.saveBeritaChanges(berita.rowId, {
                    judul,
                    konten,
                    status,
                    tanggal,
                    gambar
                });

                return success;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                window.location.reload();
            }
        });
    }

    // Delete berita
    deleteBerita(index) {
        Swal.fire({
            title: 'Konfirmasi Hapus',
            text: 'Apakah Anda yakin ingin menghapus berita ini?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Ya, Hapus'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const data = this.getCurrentDataSync();
                if (!data || !data[index]) return;

                const berita = this.mapBeritaData(data[index]);
                const rowId = berita.rowId || index + 1;

                const success = await this.api.deleteData('berita', rowId);
                
                if (success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berita Dihapus',
                        text: 'Berita berhasil dihapus dari sistem',
                        confirmButtonColor: '#002d5d',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal Hapus',
                        text: 'Gagal menghapus berita dari Google Sheets',
                        confirmButtonColor: '#dc3545'
                    });
                }
            }
        });
    }

    // Simpan perubahan berita
        async saveBeritaChanges(rowId, updatedData) {
            try {
                let success = true;

                // Update data di Google Sheets - gunakan columnName (header) bukan index
                success = success && await this.api.updateData('berita', rowId, 'judul', updatedData.judul);
                success = success && await this.api.updateData('berita', rowId, 'konten', updatedData.konten);
                success = success && await this.api.updateData('berita', rowId, 'tanggal', updatedData.tanggal);
                success = success && await this.api.updateData('berita', rowId, 'gambar', updatedData.gambar);

                return success;
            } catch (error) {
                console.error('Error saving berita changes:', error);
                return false;
            }
        }

    // Setup event listeners
    setupEventListeners() {
        // Setup untuk form tambah berita
        const addForm = document.getElementById('addForm');
        const saveButton = document.querySelector('[onclick="saveBerita()"]');

        if (saveButton && addForm) {
            saveButton.onclick = () => this.saveNewBerita();
        }

        // Setup filter
        const filterButtons = document.querySelectorAll('[onclick*="filter"]');
        filterButtons.forEach(btn => {
            btn.onclick = () => this.filterBerita();
        });
    }

    // Simpan berita baru
    async saveNewBerita() {
        const judul = document.querySelector('#addForm input[type="text"]')?.value;
        const konten = document.querySelector('#addForm textarea')?.value;
        const tanggal = document.querySelector('#addForm input[type="date"]')?.value;
        const status = document.querySelector('#addForm select')?.value;
        const gambar = document.querySelector('#addForm input[type="url"]')?.value;

        if (!judul || !konten || !tanggal || !status) {
            Swal.fire({
                icon: 'error',
                title: 'Data Tidak Lengkap',
                text: 'Harap isi Judul, Konten, Tanggal, dan Status',
                confirmButtonColor: '#dc3545'
            });
            return;
        }

        const newBerita = {
            'Judul Berita': judul,
            'Isi Berita': konten,
            'Tanggal': tanggal,
            'Link Gambar': gambar || ''
        };

        const success = await this.api.addData('berita', newBerita);
        
        if (success) {
            Swal.fire({
                icon: 'success',
                title: 'Berita Tersimpan',
                text: 'Berita berhasil disimpan ke Google Sheets',
                confirmButtonColor: '#002d5d'
            }).then(() => {
                window.location.reload();
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menyimpan',
                text: 'Gagal menyimpan berita ke Google Sheets',
                confirmButtonColor: '#dc3545'
            });
        }
    }

    // Filter berita
    filterBerita() {
        console.log('Filter berita diimplementasikan');
    }

    // Helper function untuk mendapatkan data saat ini
    async getCurrentData() {
        return await this.api.loadData('berita');
    }

    getCurrentDataSync() {
        // This is called from inline handlers
        return [];
    }
}

// Inisialisasi BeritaManager ketika halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    if (window.gsAPI) {
        window.beritaManager = new BeritaManager();
        window.beritaManager.init();
    }
});

// Export untuk global access
window.BeritaManager = BeritaManager;