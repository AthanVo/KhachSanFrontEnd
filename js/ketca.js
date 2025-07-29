// Biến lưu thông tin ca hiện tại
let currentShift = null;
let userRole = "Nhân viên"; // Mặc định

// Hàm định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Hàm hiển thị thông báo toast
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error('Không tìm thấy toast-container trong DOM!');
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="message">${message}</span>
        <button class="close" onclick="this.parentElement.classList.add('hide'); setTimeout(() => this.parentElement.remove(), 500);">×</button>
    `;
    console.log('Đang thêm toast:', message);
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            console.log('Xóa toast:', message);
            toast.remove();
        }, 500); // Đợi animation slideOut hoàn thành
    }, 3500);
}

// Hàm lấy thông tin người dùng hiện tại
function fetchCurrentUser() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        window.location.href = 'login.html';
        return Promise.reject('No token');
    }

    return fetch('https://localhost:5001/api/KhachSanAPI/current-user', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                console.error(`Yêu cầu API thất bại: Status ${response.status}, StatusText: ${response.statusText}`);
                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                userRole = data.user.vaiTro;
                console.log('Thông tin người dùng:', data.user);
                return data.user; // Trả về dữ liệu người dùng
            } else {
                console.error('Lỗi khi lấy thông tin người dùng:', data.message);
                throw new Error(data.message || 'Không thể lấy thông tin người dùng');
            }
        })
        .catch(error => {
            console.error('Lỗi khi lấy thông tin người dùng:', error);
            if (error.message === 'Unauthorized') {
                showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
                localStorage.removeItem('jwtToken');
                localStorage.removeItem('username');
                localStorage.removeItem('vaitro');
                localStorage.removeItem('hoTen');
                window.location.href = 'login.html';
            }
            throw error; // Ném lỗi để xử lý ở .catch()
        });
}

// Hàm tải thông tin ca hiện tại
function fetchCurrentShift() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        window.location.href = 'login.html';
        return Promise.reject('No token');
    }

    console.log('Đang gọi API để lấy ca hiện tại...');
    return fetch('https://localhost:5001/api/KhachSanAPI/current-shift', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            console.log('Phản hồi từ server:', response.status);
            if (!response.ok) {
                console.error(`Yêu cầu API thất bại: Status ${response.status}, StatusText: ${response.statusText}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Dữ liệu nhận được:', data);
            if (data.success) {
                currentShift = data;
                document.getElementById('shift-id').textContent = data.shift.maCa || 'N/A';
                const thoiGianBatDau = data.shift.thoiGianBatDau
                    ? new Date(data.shift.thoiGianBatDau.replace(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:$6'))
                    : null;
                document.getElementById('shift-start').textContent = thoiGianBatDau
                    ? thoiGianBatDau.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
                    : 'N/A';
                document.getElementById('shift-end').textContent = new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
                document.getElementById('shift-total').textContent = formatCurrency(data.tongTienHoaDon || 0);
                document.getElementById('shift-transfer').textContent = formatCurrency(data.shift.tongTienChuyenGiao || 0);
            } else {
                console.error('Lỗi từ API:', data.message);
                showToast(data.message || 'Không thể lấy thông tin ca hiện tại', 'error');
            }
        })
        .catch(error => {
            console.error('Lỗi chi tiết khi tải thông tin ca hiện tại:', error);
            showToast('Không thể kết nối đến server. Vui lòng kiểm tra mạng hoặc thử lại sau.', 'error');
        });
}

// Hàm tải danh sách nhân viên cho ca tiếp theo
function loadStaffList() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        window.location.href = 'login.html';
        return Promise.reject('No token');
    }

    return fetch('https://localhost:5001/api/KhachSanAPI/staff/available', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                console.error(`Yêu cầu API thất bại: Status ${response.status}, StatusText: ${response.statusText}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const staffSelect = document.getElementById('next-staff');
            staffSelect.innerHTML = '<option value="">-- Không chọn --</option>';

            if (data.success && Array.isArray(data.nhanViens)) {
                data.nhanViens.forEach(staff => {
                    const option = document.createElement('option');
                    option.value = staff.maNguoiDung;
                    option.textContent = `${staff.hoTen} - ${staff.soDienThoai}`;
                    staffSelect.appendChild(option);
                });
            } else {
                console.error('Dữ liệu nhân viên không hợp lệ:', data);
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải danh sách nhân viên:', error);
        });
}

// Hàm tải danh sách nhân viên cho dropdown admin-staff
function loadAdminStaffList() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        window.location.href = 'login.html';
        return Promise.reject('No token');
    }

    return fetch('https://localhost:5001/api/KhachSanAPI/staff/available', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                console.error(`Yêu cầu API thất bại: Status ${response.status}, StatusText: ${response.statusText}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const adminStaffSelect = document.getElementById('admin-staff');
            adminStaffSelect.innerHTML = '<option value="">-- Chọn nhân viên --</option>';

            if (data.success && Array.isArray(data.nhanViens)) {
                data.nhanViens.forEach(staff => {
                    const option = document.createElement('option');
                    option.value = staff.maNguoiDung;
                    option.textContent = `${staff.hoTen} - ${staff.soDienThoai}`;
                    adminStaffSelect.appendChild(option);
                });
            } else {
                console.error('Dữ liệu nhân viên không hợp lệ:', data);
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải danh sách nhân viên:', error);
        });
}

// Hàm mở modal kết ca
function openShiftEndModal() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        window.location.href = 'login.html';
        return;
    }

    const adminStaffSection = document.getElementById('admin-staff-selection');
    if (userRole === "Quản trị") {
        adminStaffSection.style.display = 'block';
        loadAdminStaffList();
    } else {
        adminStaffSection.style.display = 'none';
    }

    document.getElementById('shiftEndModal').style.display = 'block';

    Promise.all([
        fetchCurrentShift().catch(error => {
            console.error('Lỗi khi tải ca hiện tại:', error);
            return null;
        }),
        loadStaffList().catch(error => {
            console.error('Lỗi khi tải danh sách nhân viên:', error);
            return null;
        })
    ]).catch(error => {
        console.error('Lỗi khi tải dữ liệu cho modal:', error);
    });
}

// Hàm đóng modal kết ca
function closeShiftEndModal() {
    document.getElementById('shiftEndModal').style.display = 'none';
}

// Hàm gửi yêu cầu kết thúc ca
function submitShiftEnd() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        window.location.href = 'login.html';
        return;
    }

    const nextStaffSelect = document.getElementById('next-staff');
    const adminStaffSelect = document.getElementById('admin-staff');
    const shiftNote = document.getElementById('shift-note');
    const total = parseFloat((document.getElementById('shift-total').textContent || '0').replace(/[^\d.-]/g, ''));
    const transfer = parseFloat((document.getElementById('shift-transfer').textContent || '0').replace(/[^\d.-]/g, ''));

    // Kiểm tra GhiChu
    if (!shiftNote || !shiftNote.value.trim()) {    
        showToast('Vui lòng nhập ghi chú cho ca làm việc', 'error');
        return;
    }

    const tongTienTrongCa = currentShift?.tongTienHoaDon || 0;
const data = {
    TongTienTrongCa: tongTienTrongCa,
    TongTienChuyenGiao: nextStaffSelect.value ? tongTienTrongCa : 0,
    GhiChu: shiftNote.value.trim(),
    MaNhanVienCaTiepTheo: nextStaffSelect.value ? parseInt(nextStaffSelect.value) : null,
    MaNhanVien: userRole === "Quản trị" && adminStaffSelect.value ? parseInt(adminStaffSelect.value) : null
};

    console.log('Đang gửi yêu cầu kết thúc ca với dữ liệu:', data);

    fetch('https://localhost:5001/api/KhachSanAPI/end-shift', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            console.log('Phản hồi từ server:', response.status, response.statusText);
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(`HTTP error! Status: ${response.status}, Message: ${err.errors?.GhiChu?.[0] || err.message || 'Không có thông tin lỗi'}`);
                });
            }
            return response.json();
        })
        .then(result => {
            console.log('Kết quả từ API:', result);
            if (result.success) {
                showToast(result.message || 'Kết ca thành công', 'success');
                closeShiftEndModal();
            } else {
                showToast(result.message || 'Có lỗi xảy ra khi kết thúc ca', 'error');
            }
        })
        .catch(error => {
            console.error('Lỗi khi gửi yêu cầu kết thúc ca:', error);
            showToast(`Đã xảy ra lỗi khi kết thúc ca làm việc: ${error.message}`, 'error');
        });
}
// Hàm xử lý khi thay đổi nhân viên ca tiếp theo
function onNextStaffChange() {
    const nextStaffSelect = document.getElementById('next-staff');
    const transferField = document.querySelector('.transfer-field');
    const transferElement = document.getElementById('shift-transfer');

    if (nextStaffSelect.value) {
        transferField.style.display = 'block';
        // Tự động cập nhật shift-transfer bằng TongTienTrongCa
        const tongTienTrongCa = currentShift?.tongTienHoaDon || 0;
        transferElement.textContent = formatCurrency(tongTienTrongCa);
    } else {
        transferField.style.display = 'none';
        transferElement.textContent = formatCurrency(0); // Đặt lại về 0 nếu không chọn nhân viên ca tiếp theo
    }
}

// Khởi tạo sự kiện khi trang được tải
document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        window.location.href = 'login.html';
        return;
    }

    fetchCurrentUser();
    const nextStaffSelect = document.getElementById('next-staff');
    if (nextStaffSelect) {
        nextStaffSelect.addEventListener('change', onNextStaffChange);
    }
});