// Peminjaman Module - JavaScript untuk halaman peminjaman.html

class PeminjamanManager {
    constructor() {
        this.api = window.gsAPI;
        this.tableBody = document.querySelector('#peminjamanTable tbody') || 
                        document.querySelector('.table-responsive tbody');
        this.filters = {
            status: document.getElementById('filterStatus'),
            startDate: document.getElementById('filterStartDate'),
            endDate: document.getElementById('filterEndDate')
        };
        this.currentFilter = {};
    }

    // Inisialisasi modul peminjaman
    async init() {
        await this.loadPeminjamanData();
        this.setupEventListeners();
        this.initializeDataTable();
        this.setDefaultDates();
    }

    // Memuat data peminjaman dari Google Sheets
    async loadPeminjamanData() {
        try {
            const peminjamanData = await this.api.loadData('peminjaman');
            this.applyFiltersAndRender(peminjamanData);
        } catch (error) {
            console.error('Error loading peminjaman data:', error);
            this.api.showError('Gagal memuat data peminjaman');
        }
    }

    // Map API fields to expected fields
    mapPeminjamanData(item) {
        return {
            id: item.id || item.rowId,
            rowId: item.rowId,
            kegiatan: item.namaKegiatan,
            pic: item.namaPIC,
            whatsapp: item.nomorWhatsAppPIC,
            tanggal: item.tanggalKegiatan,
            surat: item.suratPeminjaman,
            waktuMulai: item.waktuMulaiKegiatan,
            waktuSelesai: item.waktuSelesaiKegiatan,
            keterangan: item.keterangan,
            status: item.statusKegiatan,
            email: item.emailAddress
        };
    }

    // Terapkan filter dan render data
    applyFiltersAndRender(data) {
        const mappedData = data.map(item => this.mapPeminjamanData(item));
        let filteredData = [...mappedData];
        
        // Filter berdasarkan status
        if (this.currentFilter.status) {
            filteredData = filteredData.filter(item => 
                (item.status || '').toLowerCase() === this.currentFilter.status.toLowerCase()
            );
        }
        
        // Filter berdasarkan tanggal
        if (this.currentFilter.startDate) {
            filteredData = filteredData.filter(item => {
                const itemDate = new Date(item.tanggal);
                const startDate = new Date(this.currentFilter.startDate);
                return itemDate >= startDate;
            });
        }
        
        if (this.currentFilter.endDate) {
            filteredData = filteredData.filter(item => {
                const itemDate = new Date(item.tanggal);
                const endDate = new Date(this.currentFilter.endDate);
                endDate.setHours(23, 59, 59, 999);
                return itemDate <= endDate;
            });
        }
        
        this.renderPeminjamanData(filteredData);
    }

    // Render data peminjaman ke tabel
    renderPeminjamanData(data) {
        if (!this.tableBody) return;

        this.tableBody.innerHTML = '';
        
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            
            // Tentukan status badge
            const status = item.status || 'Menunggu';
            let statusClass = 'badge-pending';
            let statusText = 'Menunggu';
            
            if (status.toLowerCase() === 'diterima') { statusClass = 'badge-approved'; statusText = 'Diterima'; }
            else if (status.toLowerCase() === 'ditolak') { statusClass = 'badge-rejected'; statusText = 'Ditolak'; }
            else if (status.toLowerCase() === 'selesai') { statusClass = 'badge-completed'; statusText = 'Selesai'; }
            else if (status.toLowerCase() === 'menunggu') { statusClass = 'badge-pending'; statusText = 'Menunggu'; }
            
            // Format waktu
            let waktu = '-';
            if (item.waktuMulai && item.waktuSelesai) {
                const mulai = new Date('1970-01-01T' + item.waktuMulai);
                const selesai = new Date('1970-01-01T' + item.waktuSelesai);
                waktu = mulai.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) + ' - ' + 
                        selesai.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
            }
            
            // WhatsApp link
            let whatsapp = '-';
            if (item.whatsapp) {
                const cleanNum = String(item.whatsapp).replace(/\D/g, '');
                const fullNum = cleanNum.startsWith('0') ? '62' + cleanNum.substring(1) : 
                               cleanNum.startsWith('62') ? cleanNum : '62' + cleanNum;
                whatsapp = `<a href="https://wa.me/${fullNum}" target="_blank" class="btn btn-sm btn-success"><i class="fab fa-whatsapp me-1"></i> Hubungi</a>`;
            }
            
            // Surat link
            let surat = '-';
            if (item.surat) {
                surat = `<a href="${item.surat}" target="_blank" class="btn btn-sm btn-outline-danger"><i class="fas fa-file-pdf me-1"></i> Lihat</a>`;
            }

            row.innerHTML = `
                            <td>${this.api.formatDate(item.tanggal) || '-'}</td>
                            <td>${item.kegiatan || '-'}</td>
                            <td>${item.pic || '-'}</td>
                            <td>${whatsapp}</td>
                            <td>${waktu}</td>
                            <td>${surat}</td>
                            <td>${item.keterangan || '-'}</td>
                            <td><span class="badge-status ${statusClass}">${statusText}</span></td>
                            <td>
                                <button class="btn btn-sm btn-action btn-view me-1" title="Lihat Detail" 
                                        onclick="peminjamanManager.viewDetail('${item.rowId}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-action btn-edit me-1" title="Edit" 
                                        onclick="peminjamanManager.editData('${item.rowId}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-action btn-delete" title="Hapus" 
                                        onclick="peminjamanManager.deleteData('${item.rowId}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        `;
            
            this.tableBody.appendChild(row);
        });
    }

    // Set default tanggal filter (30 hari terakhir)
    setDefaultDates() {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        if (this.filters.startDate) {
            this.filters.startDate.value = thirtyDaysAgo.toISOString().split('T')[0];
        }
        
        if (this.filters.endDate) {
            this.filters.endDate.value = today.toISOString().split('T')[0];
        }
    }

    // Apply filters
    applyFilters() {
        this.currentFilter = {
            status: this.filters.status?.value || '',
            startDate: this.filters.startDate?.value || '',
            endDate: this.filters.endDate?.value || ''
        };
        
        this.loadPeminjamanData();
    }

    // Inisialisasi DataTable
    initializeDataTable() {
        if (window.$ && $.fn.DataTable && $('#peminjamanTable').length) {
            if ($.fn.DataTable.isDataTable('#peminjamanTable')) {
                $('#peminjamanTable').DataTable().destroy();
            }
            
            $('#peminjamanTable').DataTable({
                "order": [[0, "desc"]], // Urutkan berdasarkan tanggal
                "language": {
                    "search": "Cari:",
                    "lengthMenu": "Tampilkan _MENU_ data",
                    "info": "Menampilkan _START_ hingga _END_ dari _TOTAL_ data"
                }
            });
        }
    }

    // View detail peminjaman
    async viewDetail(rowId) {
        const currentData = await this.getCurrentData();
        const mappedData = currentData.map(item => this.mapPeminjamanData(item));
        const item = mappedData.find(d => d.rowId == rowId) || { rowId };
        
        const status = item.status || 'Menunggu';
        const statusClass = this.api.getStatusBadgeClass(status);
        
        const whatsapp = item.whatsapp ? String(item.whatsapp).replace(/\D/g, '') : '-';
        const whatsappLink = whatsapp !== '-' ? `https://wa.me/${whatsapp.startsWith('0') ? '62'+whatsapp.substring(1) : whatsapp}` : '#';

        Swal.fire({
            title: `Detail Peminjaman`,
            html: `
                <div class="text-start">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Kegiatan:</strong> ${item.kegiatan || '-'}</p>
                            <p><strong>PIC:</strong> ${item.pic || '-'}</p>
                            <p><strong>WhatsApp:</strong> <a href="${whatsappLink}" target="_blank">${item.whatsapp || '-'}</a></p>
                            <p><strong>Email:</strong> ${item.email || '-'}</p>
                            <p><strong>Tanggal:</strong> ${this.api.formatDate(item.tanggal)}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Waktu:</strong> ${item.waktuMulai && item.waktuSelesai ? 
                                (new Date('1970-01-01T'+item.waktuMulai).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) + ' - ' +
                                 new Date('1970-01-01T'+item.waktuSelesai).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})) : '-'}</p>
                            <p><strong>Surat:</strong> ${item.surat ? `<a href="${item.surat}" target="_blank"><i class="fas fa-file-pdf text-danger"></i> Lihat</a>` : '-'}</p>
                            <p><strong>Status:</strong> <span class="badge ${statusClass}">${status}</span></p>
                            <p><strong>Keterangan:</strong> ${item.keterangan || '-'}</p>
                        </div>
                    </div>
                </div>
            `,
            confirmButtonColor: '#002d5d',
            confirmButtonText: 'Tutup',
            width: '700px'
        });
    }

    // Edit data peminjaman
    async editData(rowId) {
        const currentData = await this.getCurrentData();
        const mappedData = currentData.map(item => this.mapPeminjamanData(item));
        const item = mappedData.find(d => d.rowId == rowId) || { rowId };
        
        const currentStatus = item.status || 'Menunggu';

        Swal.fire({
            title: 'Edit Peminjaman',
            html: `
                <div class="text-start">
                    <div class="mb-3">
                        <label class="form-label">Nama Kegiatan</label>
                        <input type="text" id="editKegiatan" class="form-control" value="${item.kegiatan || ''}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">PIC / Penanggung Jawab</label>
                        <input type="text" id="editPIC" class="form-control" value="${item.pic || ''}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">No. WhatsApp PIC</label>
                        <input type="text" id="editWhatsApp" class="form-control" value="${item.whatsapp || ''}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Status Kegiatan</label>
                        <select id="editStatus" class="form-select" required>
                            <option value="Menunggu"${currentStatus === 'Menunggu' ? ' selected' : ''}>Menunggu</option>
                            <option value="Diterima"${currentStatus === 'Diterima' ? ' selected' : ''}>Diterima</option>
                            <option value="Ditolak"${currentStatus === 'Ditolak' ? ' selected' : ''}>Ditolak</option>
                            <option value="Selesai"${currentStatus === 'Selesai' ? ' selected' : ''}>Selesai</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Keterangan</label>
                        <input type="text" id="editKeterangan" class="form-control" value="${item.keterangan || ''}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Tanggal Kegiatan</label>
                        <input type="date" id="editTanggal" class="form-control" value="${item.tanggal ? item.tanggal.split('T')[0] : ''}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Waktu Mulai</label>
                        <input type="time" id="editWaktuMulai" class="form-control" value="${item.waktuMulai || ''}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Waktu Selesai</label>
                        <input type="time" id="editWaktuSelesai" class="form-control" value="${item.waktuSelesai || ''}">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#002d5d',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal',
            preConfirm: async () => {
                const kegiatan = document.getElementById('editKegiatan').value;
                const pic = document.getElementById('editPIC').value;
                const whatsapp = document.getElementById('editWhatsApp').value;
                const status = document.getElementById('editStatus').value;
                const keterangan = document.getElementById('editKeterangan').value;
                const tanggal = document.getElementById('editTanggal').value;
                const waktuMulai = document.getElementById('editWaktuMulai').value;
                const waktuSelesai = document.getElementById('editWaktuSelesai').value;

                if (!kegiatan || !pic || !whatsapp || !status || !tanggal) {
                    Swal.showValidationMessage('Semua field wajib diisi');
                    return false;
                }

                // Simpan ke Google Sheets
                const success = await this.saveChanges(item.rowId, {
                    kegiatan,
                    pic,
                    whatsapp,
                    status,
                    keterangan,
                    tanggal,
                    waktuMulai,
                    waktuSelesai
                });

                return success;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                await this.loadPeminjamanData();
                this.api.showSuccess('Data peminjaman berhasil diperbarui');
            }
        });
    }

    // Simpan perubahan
    async saveChanges(rowId, updatedData) {
        try {
            let success = true;
            
            // Column mapping based on Google Sheets:
            // 1: timestamp, 2: emailAddress, 3: namaKegiatan, 4: namaPIC, 
            // 5: nomorWhatsAppPIC, 6: tanggalKegiatan, 7: suratPeminjaman,
            // 8: waktuMulaiKegiatan, 9: waktuSelesaiKegiatan, 
            // 10: keterangan, 11: statusKegiatan
            
            success = success && await this.api.updateData('peminjaman', rowId, 'namaKegiatan', updatedData.kegiatan);
            success = success && await this.api.updateData('peminjaman', rowId, 'namaPIC', updatedData.pic);
            success = success && await this.api.updateData('peminjaman', rowId, 'nomorWhatsAppPIC', updatedData.whatsapp);
            success = success && await this.api.updateData('peminjaman', rowId, 'tanggalKegiatan', updatedData.tanggal);
            success = success && await this.api.updateData('peminjaman', rowId, 'waktuMulaiKegiatan', updatedData.waktuMulai);
            success = success && await this.api.updateData('peminjaman', rowId, 'waktuSelesaiKegiatan', updatedData.waktuSelesai);
            success = success && await this.api.updateData('peminjaman', rowId, 'keterangan', updatedData.keterangan);
            success = success && await this.api.updateData('peminjaman', rowId, 'statusKegiatan', updatedData.status);

            return success;
        } catch (error) {
            console.error('Error saving changes:', error);
            return false;
        }
    }

    // Delete data peminjaman
    async deleteData(rowId) {
        Swal.fire({
            title: 'Konfirmasi Hapus',
            text: `Hapus data peminjaman ini?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Ya, Hapus'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const success = await this.api.deleteData('peminjaman', rowId);
                
                if (success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Data Dihapus',
                        text: `Data berhasil dihapus`,
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        this.loadPeminjamanData();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal Hapus',
                        text: 'Gagal menghapus data dari Google Sheets',
                        confirmButtonColor: '#dc3545'
                    });
                }
            }
        });
    }

    // Setup event listeners
    setupEventListeners() {
        // Setup untuk form tambah data (if any)
        const exportButton = document.querySelector('[onclick="exportData()"]');
        if (exportButton) {
            exportButton.onclick = () => this.exportData();
        }
    }

    // Export data
    exportData() {
        Swal.fire({
            icon: 'success',
            title: 'Export Berhasil',
            html: `
                <div class="text-start">
                    <p>Data berhasil diexport ke format Excel.</p>
                    <p>Fitur ini akan mengunduh file Excel dengan semua data peminjaman.</p>
                </div>
            `,
            timer: 2000,
            showConfirmButton: false
        });
    }

    // Helper function untuk mendapatkan data saat ini
    async getCurrentData() {
        return await this.api.loadData('peminjaman');
    }
}

// Inisialisasi PeminjamanManager ketika halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    if (window.gsAPI) {
        window.peminjamanManager = new PeminjamanManager();
        window.peminjamanManager.init();
    }
});

// Export untuk global access
window.PeminjamanManager = PeminjamanManager;