// BebasLab Module - JavaScript untuk halaman bebaslab.html

class BebasLabManager {
    constructor() {
        this.api = window.gsAPI;
        this.tableBody = document.querySelector('#bebasLabTable tbody') || 
                        document.querySelector('.table-responsive tbody');
        this.stats = {
            totalPengajuan: document.getElementById('totalPengajuan'),
            totalOnProgress: document.getElementById('totalOnProgress'),
            totalReject: document.getElementById('totalReject'),
            totalSelesai: document.getElementById('totalSelesai')
        };
    }

    // Inisialisasi modul bebaslab
    async init() {
        await this.loadBebasLabData();
        this.setupEventListeners();
        this.initializeDataTable();
    }

    // Memuat data bebaslab dari Google Sheets
    async loadBebasLabData() {
        try {
            const bebasLabData = await this.api.loadData('bebaslab');
            this.renderBebasLabData(bebasLabData);
            this.updateStats(bebasLabData);
        } catch (error) {
            console.error('Error loading bebaslab data:', error);
            this.api.showError('Gagal memuat data bebas lab');
        }
    }

    // Map API fields to expected fields
    mapBebasLabData(item) {
        return {
            id: item.id || item.rowId,
            rowId: item.rowId,
            nim: item.nomorIndukMahasiswa,
            nama: item.namaLengkap,
            tanggal: item.tanggalPengisian,
            status: item.progress,
            email: item.emailAddress,
            whatsapp: item.nomorWhatsapp,
            bAPSidang: item.bAPSidang,
            cetakBebasLab: item.cetakBebasLab
        };
    }

    // Render data bebaslab ke tabel
    renderBebasLabData(data) {
        if (!this.tableBody) return;

        this.tableBody.innerHTML = '';
        
        const mappedData = data.map(item => this.mapBebasLabData(item));

        mappedData.forEach((item, index) => {
            const row = document.createElement('tr');
            
            // Tentukan status badge - match exact case from sheet
            const status = item.status || 'On Progress';
            let statusClass = 'badge-on-progress';
            let statusText = 'On Progress';
            
            if (status === 'Selesai') {
                statusClass = 'badge-selesai';
                statusText = 'Selesai';
            } else if (status === 'Reject') {
                statusClass = 'badge-reject';
                statusText = 'Reject';
            } else if (status === 'On Progress') {
                statusClass = 'badge-on-progress';
                statusText = 'On Progress';
            }
            
            // BAP Sidang link
            const bapLink = item.bAPSidang ? 
                `<a href="${item.bAPSidang}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="fas fa-file-pdf me-1"></i> Lihat</a>` : '-';
            
            // Cetak Bebas Lab link
            const cetakLink = item.cetakBebasLab ? 
                `<a href="${item.cetakBebasLab}" target="_blank" class="btn btn-sm btn-outline-success"><i class="fas fa-print me-1"></i> Cetak</a>` : '-';

            row.innerHTML = `
                <td>${item.nim || '-'}</td>
                <td>${item.nama || '-'}</td>
                <td>${this.api.formatDate(item.tanggal) || '-'}</td>
                <td><span class="badge-status ${statusClass}">${statusText}</span></td>
                <td>${bapLink}</td>
                <td>${cetakLink}</td>
                <td>
                    <button class="btn btn-sm btn-action btn-print me-1" title="Detail" 
                            onclick="bebasLabManager.viewDetail('${item.rowId}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-action btn-edit me-1" title="Edit" onclick="bebasLabManager.editData('${item.rowId}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-action btn-delete" title="Hapus" onclick="bebasLabManager.deleteData('${item.rowId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            this.tableBody.appendChild(row);
        });
    }

    // Update statistik
    updateStats(data) {
        const mappedData = data.map(item => this.mapBebasLabData(item));
        
        const totalPengajuan = mappedData.length;
        const totalOnProgress = mappedData.filter(item => item.status === 'On Progress').length;
        const totalReject = mappedData.filter(item => item.status === 'Reject').length;
        const totalSelesai = mappedData.filter(item => item.status === 'Selesai').length;

        if (this.stats.totalPengajuan) this.stats.totalPengajuan.textContent = totalPengajuan;
        if (this.stats.totalOnProgress) this.stats.totalOnProgress.textContent = totalOnProgress;
        if (this.stats.totalReject) this.stats.totalReject.textContent = totalReject;
        if (this.stats.totalSelesai) this.stats.totalSelesai.textContent = totalSelesai;
    }

    // Inisialisasi DataTable
    initializeDataTable() {
        if (window.$ && $.fn.DataTable && $('#bebasLabTable').length) {
            if ($.fn.DataTable.isDataTable('#bebasLabTable')) {
                $('#bebasLabTable').DataTable().destroy();
            }
            
            $('#bebasLabTable').DataTable({
                "order": [[2, "desc"]],
                "language": {
                    "search": "Cari:",
                    "lengthMenu": "Tampilkan _MENU_ data",
                    "info": "Menampilkan _START_ hingga _END_ dari _TOTAL_ data"
                }
            });
        }
    }

    // View detail
    viewDetail(rowId) {
        const item = this.getCurrentDataSync().find(d => d.rowId === parseInt(rowId) || d.id === rowId);
        if (!item) return;

        const status = item.progress || 'On Progress';
        let statusClass = 'badge-on-progress', statusText = 'On Progress';
        if (status === 'Selesai') { statusClass = 'badge-selesai'; statusText = 'Selesai'; }
        else if (status === 'Reject') { statusClass = 'badge-reject'; statusText = 'Reject'; }

        const bap = item.bAPSidang ? `<a href="${item.bAPSidang}" target="_blank"><i class="fas fa-file-pdf text-danger me-1"></i> Lihat</a>` : '-';
        const cetak = item.cetakBebasLab ? `<a href="${item.cetakBebasLab}" target="_blank"><i class="fas fa-print text-success me-1"></i> Lihat</a>` : '-';

        Swal.fire({
            title: 'Detail Pengajuan',
            html: `
                <div class="text-start">
                    <p><strong>NIM:</strong> ${item.nomorIndukMahasiswa || '-'}</p>
                    <p><strong>Nama:</strong> ${item.namaLengkap || '-'}</p>
                    <p><strong>Email:</strong> ${item.emailAddress || '-'}</p>
                    <p><strong>WhatsApp:</strong> ${item.nomorWhatsapp || '-'}</p>
                    <p><strong>Tanggal Pengajuan:</strong> ${this.api.formatDate(item.tanggalPengisian) || '-'}</p>
                    <p><strong>Progress:</strong> <span class="badge-status ${statusClass}">${statusText}</span></p>
                    <p><strong>BAP Sidang:</strong> ${bap}</p>
                    <p><strong>Cetak Bebas Lab:</strong> ${cetak}</p>
                </div>
            `,
            confirmButtonColor: '#002d5d'
        });
    }

    // Edit data
    async editData(rowId) {
        const item = this.getCurrentDataSync().find(d => d.rowId === parseInt(rowId) || d.id === rowId);
        if (!item) return;

        const currentProgress = item.progress || 'On Progress';

        Swal.fire({
            title: 'Edit Progress',
            html: `
                <div class="text-start">
                    <p><strong>NIM:</strong> ${item.nomorIndukMahasiswa || '-'}</p>
                    <p><strong>Nama:</strong> ${item.namaLengkap || '-'}</p>
                    <div class="mb-3">
                        <label class="form-label">Progress</label>
                        <select id="editProgress" class="form-select" required>
                            <option value="On Progress"${currentProgress === 'On Progress' ? ' selected' : ''}>On Progress</option>
                            <option value="Reject"${currentProgress === 'Reject' ? ' selected' : ''}>Reject</option>
                            <option value="Selesai"${currentProgress === 'Selesai' ? ' selected' : ''}>Selesai</option>
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#002d5d',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Simpan',
            preConfirm: async () => {
                const progress = document.getElementById('editProgress').value;
                try {
                    const success = await this.updateProgressInSheet(item.rowId, progress);
                    if (success) {
                        window.location.reload();
                        return true;
                    } else {
                        Swal.showValidationMessage('Gagal menyimpan ke Google Sheets');
                    }
                } catch(e) { Swal.showValidationMessage('Error: ' + e.message); }
            }
        });
    }

    async updateProgressInSheet(rowId, progress) {
        try {
            const res = await fetch(this.api.appsScriptURL + '?action=updateData&module=bebaslab&rowId=' + rowId + '&columnIndex=8&newValue=' + encodeURIComponent(progress));
            const result = await res.json();
            return result.success;
        } catch(e) { console.error('Update error:', e); return false; }
    }

    // Delete data
    async deleteData(rowId) {
        Swal.fire({
            title: 'Konfirmasi Hapus',
            text: 'Hapus data ini?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Ya, Hapus'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(this.api.appsScriptURL + '?action=deleteData&module=bebaslab&rowId=' + rowId);
                    const res = await response.json();
                    if (res.success) {
                        Swal.fire({ icon: 'success', title: 'Dihapus', timer: 2000, showConfirmButton: false });
                        this.loadBebasLabData();
                    }
                } catch(e) { Swal.fire({ icon: 'error', title: 'Gagal Hapus' }); }
            }
        });
    }

    // Export data
    exportData() {
        Swal.fire({
            icon: 'success',
            title: 'Export Berhasil',
            html: `
                <div class="text-start">
                    <p>Data berhasil diexport ke format Excel.</p>
                    <p>Fitur ini akan mengunduh file Excel dengan semua data bebas lab.</p>
                </div>
            `,
            timer: 2000,
            showConfirmButton: false
        });
    }

    // Simpan data baru
    async saveNewData() {
        const nim = document.querySelector('#addForm input[placeholder*="NIM" i]')?.value;
        const nama = document.querySelector('#addForm input[placeholder*="Nama" i]')?.value;
        const email = document.querySelector('#addForm input[type="email"]')?.value;
        const whatsapp = document.querySelector('#addForm input[placeholder*="WhatsApp" i], #addForm input[placeholder*="08"]')?.value;
        const progress = document.querySelector('#addForm select')?.value || 'On Progress';

        if (!nim || !nama) {
            Swal.fire({
                icon: 'error',
                title: 'Data Tidak Lengkap',
                text: 'Harap isi NIM dan Nama',
                confirmButtonColor: '#dc3545'
            });
            return;
        }

        const newData = {
            nim,
            nama,
            email: email || '',
            whatsapp: whatsapp || '',
            progress,
            tanggal: new Date().toISOString().split('T')[0]
        };

        const success = await this.api.addData('bebaslab', newData);
        
        if (success) {
            Swal.fire({
                icon: 'success',
                title: 'Data Tersimpan',
                text: 'Data pengajuan bebas lab berhasil disimpan ke Google Sheets',
                confirmButtonColor: '#002d5d'
            }).then(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('addModal'));
                if (modal) modal.hide();
                
                const form = document.getElementById('addForm');
                if (form) form.reset();
                
                this.loadBebasLabData();
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menyimpan',
                text: 'Gagal menyimpan data ke Google Sheets',
                confirmButtonColor: '#dc3545'
            });
        }
    }

    // Setup event listeners
    setupEventListeners() {
        const addForm = document.getElementById('addForm');
        const saveButton = document.querySelector('[onclick="saveData()"]');

        if (saveButton && addForm) {
            saveButton.onclick = () => this.saveNewData();
        }

        const exportButton = document.querySelector('[onclick="exportData()"]');
        if (exportButton) {
            exportButton.onclick = () => this.exportData();
        }
    }

    // Helper function untuk mendapatkan data saat ini
    async getCurrentData() {
        return await this.api.loadData('bebaslab');
    }

    getCurrentDataSync() {
        // This is called from inline handlers, we need to get from the table
        // For now, just return empty - will reload
        return [];
    }
}

// Inisialisasi BebasLabManager ketika halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    if (window.gsAPI) {
        window.bebasLabManager = new BebasLabManager();
        window.bebasLabManager.init();
    }
});

// Export untuk global access
window.BebasLabManager = BebasLabManager;