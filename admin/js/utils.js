// Google Sheets Integration Utility
// Menggunakan Google Apps Script sebagai backend untuk mengakses Google Sheets

class GoogleSheetsAPI {
    constructor() {
        // URL Google Apps Script - URL deployment web app Anda
        this.appsScriptURL = 'https://script.google.com/macros/s/AKfycbzdK8HlTDc6yh6G_SfyhCx-hA9VXT4_VHKBKaj6CYvgjhf_m9qJ2pdagdFvEHoaYTTE_w/exec';
        
        // ID Spreadsheet untuk setiap modul
        this.sheetIds = {
            berita: '15JWk-ItlTGXX3xCNtO4cc8hBLdYVJkCMo0eTcac9QO4',
            bebaslab: '1Ke7WpL9qsUlez63hyctzIJuQwpCBRbf0uQr3NROtm9g',
            peminjaman: '1Kd6te5CvI4rdn05G1taE9uaUApYxJtJdqmQeqnrut1A'
        };
        
        // Sheet names untuk setiap modul (berita pakai Sheet1, lainnya Form Responses 1)
        this.sheetNames = {
            berita: 'Sheet1',
            bebaslab: 'Form Responses 1',
            peminjaman: 'Form Responses 1'
        };
        
        // Mode development - true akan gunakan dummy data
        // SET KE FALSE UNTUK PRODUCTION/LIVE
        this.devMode = false;
    }

    // Fungsi untuk memuat data dari Google Sheets
    async loadData(module) {
        try {
            if (!this.sheetIds[module]) {
                console.error(`Module ${module} tidak dikenali`);
                return [];
            }

            // Mode development langsung return dummy data
            if (this.devMode) {
                console.log(`Development mode: using dummy data for ${module}`);
                return this.getDummyData(module);
            }

            // Coba fetch data dari Google Apps Script
            const response = await fetch(`${this.appsScriptURL}?action=getData&module=${module}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Data loaded successfully for ${module}:`, data.length, 'records');
            return data;
        } catch (error) {
            console.error(`Error loading data for ${module}:`, error);
            console.log(`Falling back to dummy data for ${module}`);
            
            // Fallback ke data dummy jika terjadi error
            return this.getDummyData(module);
        }
    }

    // Fungsi untuk memperbarui data di Google Sheets - pakai columnName (header) bukan index
    async updateData(module, rowId, columnName, newValue) {
        try {
            const response = await fetch(`${this.appsScriptURL}?action=updateData&module=${module}&rowId=${rowId}&columnName=${encodeURIComponent(columnName)}&newValue=${encodeURIComponent(newValue)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error(`Error updating data for ${module}:`, error);
            return false;
        }
    }

    // Fungsi untuk menambah data baru - menggunakan GET untuk menghindari CORS preflight
    async addData(module, rowData) {
        try {
            // Build URL params from rowData object
            const params = new URLSearchParams({
                action: 'addData',
                module: module,
                ...rowData
            });
            
            const response = await fetch(`${this.appsScriptURL}?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error(`Error adding data for ${module}:`, error);
            return false;
        }
    }

    // Fungsi untuk menghapus data
    async deleteData(module, rowId) {
        try {
            const response = await fetch(`${this.appsScriptURL}?action=deleteData&module=${module}&rowId=${rowId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error(`Error deleting data for ${module}:`, error);
            return false;
        }
    }

    // Data dummy untuk fallback
    getDummyData(module) {
        const dummyData = {
            berita: [
                {
                    id: 1,
                    rowId: 2,
                    judul: 'Pendaftaran Asprak Telah di Buka!',
                    tanggal: '2026-04-01',
                    status: 'Published',
                    dilihat: 248,
                    konten: 'Pendaftaran asisten praktikum untuk semester ganjil 2026 telah dibuka...'
                },
                {
                    id: 2,
                    rowId: 3,
                    judul: 'Workshop AI & Machine Learning 2026',
                    tanggal: '2026-03-15',
                    status: 'Published',
                    dilihat: 156,
                    konten: 'Workshop intensif tentang AI dan Machine Learning...'
                }
            ],
            bebaslab: [
                {
                    id: 'BL-001',
                    rowId: 2,
                    nim: '220102028',
                    nama: 'Faqih Muhammad Ihsan',
                    tanggal: '2026-07-10',
                    status: 'SELESAI',
                    programStudi: 'Teknik Informatika'
                },
                {
                    id: 'BL-002',
                    rowId: 3,
                    nim: '210102015',
                    nama: 'Daffa Noorfridan',
                    tanggal: '2026-07-09',
                    status: 'SELESAI',
                    programStudi: 'Teknik Informatika'
                }
            ],
            peminjaman: [
                {
                    id: 'PMJ-001',
                    rowId: 2,
                    tanggal: '2026-07-12',
                    kegiatan: 'Workshop AI & Machine Learning',
                    pic: 'Ahmad Fauzi',
                    ruangAlat: 'Lab 3, Proyektor',
                    status: 'Pending',
                    keterangan: 'Menunggu persetujuan'
                },
                {
                    id: 'PMJ-002',
                    rowId: 3,
                    tanggal: '2026-07-11',
                    kegiatan: 'Rapat Himpunan Mahasiswa',
                    pic: 'Budi Santoso',
                    ruangAlat: 'Lab 2, Sound System',
                    status: 'Approved',
                    keterangan: 'Disetujui'
                }
            ]
        };

        return dummyData[module] || [];
    }

    // Fungsi untuk menampilkan pesan error
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.innerHTML = `
            <strong>Error!</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.querySelector('#content').prepend(errorDiv);
    }

    // Fungsi untuk menampilkan pesan sukses
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success alert-dismissible fade show';
        successDiv.innerHTML = `
            <strong>Sukses!</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.querySelector('#content').prepend(successDiv);
    }

    // Fungsi untuk memformat tanggal
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Fungsi untuk mendapatkan status badge class
    getStatusBadgeClass(status) {
        const statusMap = {
            'draft': 'badge-secondary',
            'published': 'badge-success',
            'archived': 'badge-warning',
            'pending': 'badge-warning',
            'diproses': 'badge-info',
            'selesai': 'badge-success',
            'approved': 'badge-success',
            'rejected': 'badge-danger',
            'completed': 'badge-info',
            'SELESAI': 'badge-success',
            'PENDING': 'badge-warning',
            'DIPROSES': 'badge-info'
        };
        
        return statusMap[status.toLowerCase()] || 'badge-secondary';
    }
}

// Inisialisasi Google Sheets API
const gsAPI = new GoogleSheetsAPI();

// Export fungsi yang diperlukan
window.gsAPI = gsAPI;