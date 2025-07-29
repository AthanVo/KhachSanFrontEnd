// DOM Elements
const roomModal = document.getElementById('roomModal');
const bookingModal = document.getElementById('bookingModal');
const serviceModal = document.getElementById('serviceModal');
const billingModal = document.getElementById('billingModal');
const modalRoomId = document.getElementById('modal-room-id');
const modalCustomer = document.getElementById('modal-customer');
const modalType = document.getElementById('modal-type');
const modalPrice = document.getElementById('modal-price');
const modalStatus = document.getElementById('modal-status');
const modalCurrent = document.getElementById('modal-current');
const bookingRoomId = document.getElementById('booking-room-id');
const serviceRoomId = document.getElementById('service-room-id');
const billingBillId = document.getElementById('billing-bill-id');
const billingStaff = document.getElementById('billing-staff');
const billingStaffId = document.getElementById('billing-staff-id');
const billingCheckin = document.getElementById('billing-checkin');
const billingCheckout = document.getElementById('billing-checkout');
const billingNote = document.getElementById('billing-note');
const billingServices = document.getElementById('billing-services');
const billingTotalServices = document.getElementById('billing-total-services');
const billingDiscount = document.getElementById('billing-discount');
const billingRoomPrice = document.getElementById('billing-room-price');
const billingServiceFee = document.getElementById('billing-service-fee');
const billingTotal = document.getElementById('billing-total');
const billingFinal = document.getElementById('billing-final');
const billingPrepaid = document.getElementById('billing-prepaid');
const billingStatus = document.getElementById('billing-status');
const billingDatphongStatus = document.getElementById('billing-datphong-status');

let currentPage = 1;
let totalPages = 1;
const pageSize = 16;

// Hàm hiển thị thông báo xác nhận
function showConfirmDialog(message, onConfirm, onCancel) {
    Swal.fire({
        title: 'Xác nhận',
        text: message,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
        if (result.isConfirmed && typeof onConfirm === 'function') {
            onConfirm();
        } else if (typeof onCancel === 'function') {
            onCancel();
        }
    });
}

// Hàm hiển thị thông báo toast
function showToast(message, type = 'success') {
    const iconMap = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };

    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: iconMap[type] || 'info',
        title: message,
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });
}

// Hàm định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Hàm chuyển đổi định dạng ngày giờ từ "HH:mm:ss DD/M/YYYY" hoặc "HH:mm:ss DD/M/YY" sang định dạng chuẩn
function parseCustomDateTime(dateTimeStr) {
    // Kiểm tra định dạng "HH:mm:ss DD/M/YYYY" hoặc "HH:mm:ss DD/M/YY"
    const regexFullYear = /^(\d{2}:\d{2}:\d{2})\s(\d{1,2}\/\d{1,2}\/\d{4})$/;
    const regexShortYear = /^(\d{2}:\d{2}:\d{2})\s(\d{1,2}\/\d{1,2}\/\d{2})$/;
    
    let timePart, datePart, year;
    
    if (regexFullYear.test(dateTimeStr)) {
        const match = dateTimeStr.match(regexFullYear);
        timePart = match[1]; // "HH:mm:ss"
        datePart = match[2]; // "DD/M/YYYY"
        const [day, month, fullYear] = datePart.split('/').map(Number);
        year = fullYear;
        datePart = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    } else if (regexShortYear.test(dateTimeStr)) {
        const match = dateTimeStr.match(regexShortYear);
        timePart = match[1]; // "HH:mm:ss"
        datePart = match[2]; // "DD/M/YY"
        const [day, month, shortYear] = datePart.split('/').map(Number);
        // Chuyển YY thành YYYY (giả sử thế kỷ 21)
        year = 2000 + shortYear;
        datePart = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    } else {
        throw new Error('Định dạng ngày giờ không hợp lệ: ' + dateTimeStr);
    }

    // Kết hợp thành định dạng chuẩn "YYYY-MM-DD HH:mm:ss"
    const formattedDateTime = `${datePart} ${timePart}`;
    return new Date(formattedDateTime);
}

// Hàm tải danh sách phòng
async function loadRooms() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để tải danh sách phòng!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`https://localhost:5001/api/PhongAPI/list?page=${currentPage}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Yêu cầu API thất bại: Status ${response.status}`);
        }

        const data = await response.json();
        const roomsContainer = document.getElementById('rooms-container');
        if (!roomsContainer) {
            throw new Error('Không tìm thấy phần tử rooms-container trong DOM');
        }

        roomsContainer.innerHTML = '';

        if (data.success && data.rooms && data.rooms.length > 0) {
            data.rooms.forEach(room => {
                let giaTheoGio = Number(room.giaTheoGio) || 0;
                let giaTheoNgay = Number(room.giaTheoNgay) || 0;

                if (isNaN(giaTheoGio) || isNaN(giaTheoNgay)) {
                    console.warn(`Phòng ${room.maPhong} có giá không hợp lệ: gio=${room.giaTheoGio}, ngay=${room.giaTheoNgay}`);
                    giaTheoGio = 0;
                    giaTheoNgay = 0;
                }

                const priceFormatted = giaTheoGio >= 0 ? (giaTheoGio / 1000).toFixed(0) + 'K' : '0K';
                const priceDisplay = giaTheoGio >= 0 ? `${giaTheoGio.toLocaleString('vi-VN')}đ` : '0đ';

                const soPhong = room.soPhong || '';
                const loaiPhong = room.loaiPhong || '';
                const trangThai = room.trangThai || '';
                const hienTrang = room.hienTrang || '';
                const khachHang = room.khachHang || '';
                const nhanVien = room.nhanVien || '';
                const maNhanVien = room.maNhanVien || '';
                const maHoaDon = room.maHoaDon || '';
                const maDatPhong = room.maDatPhong || '';
                const ngayNhanPhong = room.ngayNhanPhong ? new Date(room.ngayNhanPhong).toLocaleString('vi-VN') : '';

                const isOccupied = room.dangSuDung ? 'occupied' : '';
                const doorIcon = room.dangSuDung ? 'fa-door-open' : 'fa-door-closed';

                roomsContainer.innerHTML += `
                    <div class="room ${isOccupied}"
                         data-room-id="${room.maPhong}"
                         data-customer="${khachHang}"
                         data-type="${loaiPhong}"
                         data-price="${priceDisplay}"
                         data-price-hour="${giaTheoGio}"
                         data-price-day="${giaTheoNgay}"
                         data-status="${trangThai}"
                         data-current="${hienTrang}"
                         data-bill-id="${maHoaDon}"
                         data-staff="${nhanVien}"
                         data-staff-id="${maNhanVien}"
                         data-checkin="${ngayNhanPhong}"
                         data-datphong-id="${maDatPhong}">
                        <div class="content">
                            <i class="fa-solid ${doorIcon} door-icon"></i>
                            <div class="name">${soPhong}</div>
                            <div class="type">${loaiPhong}</div>
                            <div class="price">${priceFormatted}</div>
                            <div class="status">${trangThai}</div>
                        </div>
                    </div>
                `;
            });

            totalPages = data.totalPages || 1;
            updatePagination();

            // Gán sự kiện cho tất cả phòng một lần
            const rooms = document.querySelectorAll('.room');
            rooms.forEach(room => {
                room.addEventListener('click', handleRoomClick);
                room.addEventListener('dblclick', handleRoomDblClick);
            });
        } else {
            roomsContainer.innerHTML = '<p>Không có phòng nào để hiển thị.</p>';
            showToast(data.message || 'Không có phòng nào trong hệ thống!', 'info');
        }
    } catch (error) {
        console.error('Lỗi khi tải danh sách phòng:', error);
        const roomsContainer = document.getElementById('rooms-container');
        if (roomsContainer) roomsContainer.innerHTML = '<p>Lỗi khi tải danh sách phòng!</p>';
        handleApiError(error);
    }
}

// Xử lý sự kiện click cho phòng
function handleRoomClick(event) {
    const room = event.currentTarget;
    const roomId = room.getAttribute('data-room-id');
    const customer = room.getAttribute('data-customer');
    const type = room.getAttribute('data-type');
    const price = room.getAttribute('data-price');
    const status = room.getAttribute('data-status');
    const current = room.getAttribute('data-current');
    const isOccupied = room.classList.contains('occupied');

    if (isOccupied) {
        modalRoomId.textContent = roomId;
        modalCustomer.textContent = customer || 'N/A';
        modalType.textContent = type || 'N/A';
        modalPrice.textContent = price || '0đ';
        modalStatus.textContent = status || 'N/A';
        modalCurrent.textContent = current || 'N/A';
        roomModal.style.display = 'block';
        bookingModal.style.display = 'none';
        serviceModal.style.display = 'none';
        billingModal.style.display = 'none';
    } else {
        bookingRoomId.textContent = roomId;
        bookingModal.style.display = 'block';
        roomModal.style.display = 'none';
        serviceModal.style.display = 'none';
        billingModal.style.display = 'none';
        const bookRoomBtn = document.getElementById('book-room-btn');
        if (bookRoomBtn) {
            bookRoomBtn.removeEventListener('click', bookRoom);
            bookRoomBtn.addEventListener('click', bookRoom);
        }
    }
}

// Xử lý sự kiện double-click cho phòng
async function handleRoomDblClick(event) {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để thanh toán!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const room = event.currentTarget;
    const isOccupied = room.classList.contains('occupied');
    if (!isOccupied) return;

    const roomId = room.getAttribute('data-room-id');
    const datPhongId = room.getAttribute('data-datphong-id');
    const staff = room.getAttribute('data-staff');
    const staffId = room.getAttribute('data-staff-id');
    const checkin = room.getAttribute('data-checkin');
    const priceHour = parseFloat(room.getAttribute('data-price-hour') || '0');
    const priceDay = parseFloat(room.getAttribute('data-price-day') || '0');
    // Lấy thông tin nhân viên hiện tại từ localStorage
    const currentStaffName = localStorage.getItem('tenDangNhap') || 'N/A'; // Sửa từ 'username' thành 'tenDangNhap'
    const currentStaffId = localStorage.getItem('maNhanVien') || 'N/A';

    if (!datPhongId || isNaN(parseInt(datPhongId))) {
        showToast('Mã đặt phòng không hợp lệ!', 'error');
        return;
    }

    if (isNaN(priceHour) || isNaN(priceDay)) {
        showToast('Giá phòng không hợp lệ!', 'error');
        return;
    }

    billingBillId.textContent = datPhongId;
    billingStatus.textContent = 'Chưa thanh toán';
    billingDatphongStatus.textContent = 'Chưa thanh toán';
    billingStaff.textContent = staff || 'N/A';
    billingStaffId.textContent = staffId || 'N/A';
    billingCheckin.textContent = checkin;
    billingCheckout.textContent = new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' });
    // Gán thông tin nhân viên tính tiền
    const currentStaffNameElement = document.getElementById('current-staff-name');
    const currentStaffIdElement = document.getElementById('current-staff-id');
    if (currentStaffNameElement) currentStaffNameElement.textContent = currentStaffName;
    if (currentStaffIdElement) currentStaffIdElement.textContent = currentStaffId;

    try {
        const bookingResponse = await fetch(`https://localhost:5001/api/KhachSanAPI/GetBookingDetails/${datPhongId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!bookingResponse.ok) {
            throw new Error(`https error! Status: ${bookingResponse.status}`);
        }

        const bookingData = await bookingResponse.json();
        if (!bookingData.success) {
            throw new Error(bookingData.message || 'Không lấy được chi tiết đặt phòng');
        }

        console.log('loaiDatPhong:', bookingData.loaiDatPhong); // Kiểm tra giá trị

        // Chuyển đổi định dạng ngày giờ
        let checkinDate;
        try {
            checkinDate = parseCustomDateTime(checkin);
        } catch (parseError) {
            console.error('Lỗi phân tích ngày nhận phòng:', parseError.message);
            showToast('Ngày nhận phòng không hợp lệ!', 'error');
            return;
        }

        if (isNaN(checkinDate.getTime())) {
            console.error('Ngày nhận phòng không hợp lệ:', checkin);
            showToast('Ngày nhận phòng không hợp lệ!', 'error');
            return;
        }

        const checkoutDate = new Date();
        const thoiGianO = (checkoutDate - checkinDate) / (1000 * 60 * 60); // Giờ
        if (isNaN(thoiGianO)) {
            console.error('Thời gian ở không hợp lệ:', thoiGianO);
            showToast('Không thể tính thời gian ở!', 'error');
            return;
        }

        let tongTienPhong = 0;
        let loaiTinhTien = bookingData.loaiDatPhong || 'TheoGio'; // Default to TheoGio if null

        // Kiểm tra xem phòng có thuộc nhóm đặt phòng không
        const isGroupBookingResponse = await fetch(`https://localhost:5001/api/KhachSanAPI/GetBookingDetails/${datPhongId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const groupData = await isGroupBookingResponse.json();
        const isGroupBooking = groupData.maNhomDatPhong && groupData.maNhomDatPhong > 0;

        if (isGroupBooking) {
            // Đặt phòng theo đoàn, luôn dùng giá theo ngày
            loaiTinhTien = 'TheoNgay';
            tongTienPhong = priceDay;
        } else if (loaiTinhTien === 'TheoNgay') {
            tongTienPhong = priceDay;
        } else if (loaiTinhTien === 'TheoGio') {
            tongTienPhong = Math.ceil(thoiGianO) * priceHour;
        } else if (loaiTinhTien === 'QuaDem') {
            tongTienPhong = priceDay; // Giả sử QuaDem dùng giá theo ngày
        } else {
            console.error('Loại đặt phòng không hợp lệ:', loaiTinhTien);
            showToast('Loại đặt phòng không hợp lệ!', 'error');
            return;
        }

        const servicesResponse = await fetch(`https://localhost:5001/api/KhachSanAPI/GetRoomServices?maDatPhong=${datPhongId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!servicesResponse.ok) {
            throw new Error(`https error! Status: ${servicesResponse.status}`);
        }

        const data = await servicesResponse.json();
        billingServices.innerHTML = '';
        let totalServices = 0;

        billingServices.innerHTML += `
            <tr>
                <td>-</td>
                <td>Tiền phòng (${loaiTinhTien})</td>
                <td>-</td>
                <td>-</td>
                <td>${loaiTinhTien === 'TheoGio' ? Math.ceil(thoiGianO) : 1}</td>
                <td>${(loaiTinhTien === 'TheoGio' ? priceHour : priceDay).toLocaleString('vi-VN')}đ</td>
                <td>0%</td>
                <td>${tongTienPhong.toLocaleString('vi-VN')}đ</td>
                <td>-</td>
            </tr>
        `;

        if (data.success && data.services) {
            data.services.forEach(service => {
                const thanhTien = Number(service.thanhTien) || 0;
                totalServices += thanhTien;
                billingServices.innerHTML += `
                    <tr>
                        <td>${service.maDichVu}</td>
                        <td>${service.tenDichVu}</td>
                        <td>-</td>
                        <td></td>
                        <td>${service.soLuong}</td>
                        <td>${service.donGia.toLocaleString('vi-VN')}đ</td>
                        <td>0%</td>
                        <td>${thanhTien.toLocaleString('vi-VN')}đ</td>
                        <td>-</td>
                    </tr>
                `;
            });
        }

        billingTotalServices.textContent = totalServices.toLocaleString('vi-VN') + 'đ';
        billingDiscount.textContent = '0đ';
        billingRoomPrice.textContent = tongTienPhong.toLocaleString('vi-VN') + 'đ';
        billingServiceFee.textContent = '0đ';
        const tempTotal = tongTienPhong + totalServices;
        if (isNaN(tempTotal)) {
            console.error('Tổng tiền không hợp lệ:', { tongTienPhong, totalServices });
            showToast('Tổng tiền không hợp lệ!', 'error');
            return;
        }
        billingTotal.textContent = tempTotal.toLocaleString('vi-VN') + 'đ';
        billingFinal.textContent = tempTotal.toLocaleString('vi-VN') + 'đ';
        billingModal.style.display = 'block';
        roomModal.style.display = 'none';
        bookingModal.style.display = 'none';
        serviceModal.style.display = 'none';
    } catch (error) {
        console.error('Lỗi khi xử lý double-click:', error);
        handleApiError(error);
    }
}

// Hàm xử lý lỗi API chung
function handleApiError(error) {
    if (error.message.includes('401')) {
        showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('username');
        localStorage.removeItem('vaitro');
        localStorage.removeItem('maNhanVien');
        window.location.href = 'login.html';
    } else if (error.message.includes('404')) {
        showToast(`Không tìm thấy API! Kiểm tra endpoint: ${error.message}`, 'error');
    } else {
        showToast(`Lỗi: ${error.message}`, 'error');
    }
}

// Hàm cập nhật phân trang
function updatePagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    pagination.innerHTML = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})" aria-label="Previous">
                <span aria-hidden="true">«</span>
            </a>
        </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
        pagination.innerHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }

    pagination.innerHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})" aria-label="Next">
                <span aria-hidden="true">»</span>
            </a>
        </li>
    `;
}

function changePage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    currentPage = page;
    loadRooms();
}

// Hàm tải thông tin thống kê
async function fetchStats() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để tải thông tin thống kê!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch('https://localhost:5001/api/KhachSanAPI/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error(`https error! Status: ${response.status}`);
        const data = await response.json();

        const totalRevenue = document.getElementById('total-revenue');
        const totalRooms = document.getElementById('total-rooms');
        const occupiedRooms = document.getElementById('occupied-rooms');
        const availableRooms = document.getElementById('available-rooms');
        const pendingPayment = document.getElementById('pending-payment');

        if (totalRevenue) totalRevenue.textContent = formatCurrency(data.totalRevenue || 0);
        if (totalRooms) totalRooms.textContent = data.totalRooms || 0;
        if (occupiedRooms) occupiedRooms.textContent = data.occupiedRooms || 0;
        if (availableRooms) availableRooms.textContent = data.availableRooms || 0;
        if (pendingPayment) pendingPayment.textContent = data.pendingPayment || 0;
    } catch (error) {
        console.error('Lỗi khi tải thông tin thống kê:', error);
        handleApiError(error);
    }
}

// Logout
async function logout() {
    await showConfirmDialog('Bạn có muốn đăng xuất không?', async () => {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            console.error('Không tìm thấy token trong localStorage');
            window.location.href = 'login.html';
            return;
        }

        try {
            const response = await fetch('https://localhost:5001/api/Auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                localStorage.removeItem('jwtToken');
                localStorage.removeItem('username');
                localStorage.removeItem('vaitro');
                localStorage.removeItem('maNhanVien');
                showToast('Đăng xuất thành công!', 'success');
                setTimeout(() => window.location.href = 'login.html', 1500);
            } else {
                showToast(data.message || 'Không thể đăng xuất.', 'error');
            }
        } catch (error) {
            console.error('Lỗi khi đăng xuất:', error);
            showToast('Có lỗi xảy ra khi đăng xuất: ' + error.message, 'error');
        }
    });
}

// Change Password
function changePassword() {
    // Kiểm tra token
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        showToast('Bạn cần đăng nhập để đổi mật khẩu!', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    // Điều hướng đến trang đổi mật khẩu
    window.location.href = 'changepassword.html';
}

// Scan CCCD
function scanCCCD() {
    const scanContainer = document.getElementById('scan-container');
    const video = document.getElementById('video');
    const canvasElement = document.getElementById('canvas');
    const canvas = canvasElement.getContext('2d', { willReadFrequently: true });
    const stopScanButton = document.getElementById('stop-scan');
    const cccdImageInput = document.getElementById('cccd-image');
    let stream = null;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Trình duyệt không hỗ trợ truy cập camera!', 'error');
        return;
    }

    scanContainer.style.display = 'block';

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(mediaStream => {
            stream = mediaStream;
            video.srcObject = stream;
            video.play().catch(err => {
                showToast('Không thể khởi động camera: ' + err.message, 'error');
                stopStream();
                scanContainer.style.display = 'none';
            });
            requestAnimationFrame(tick);
        })
        .catch(err => {
            let errorMessage = 'Không thể truy cập camera: ' + err.message;
            if (err.name === 'NotAllowedError') errorMessage = 'Vui lòng cấp quyền sử dụng camera trong cài đặt trình duyệt!';
            else if (err.name === 'NotFoundError') errorMessage = 'Không tìm thấy webcam! Hãy thử tải ảnh CCCD.';
            else if (err.name === 'NotReadableError') errorMessage = 'Webcam đang được ứng dụng khác sử dụng!';
            showToast(errorMessage, 'error');
            scanContainer.style.display = 'none';
        });

    function tick() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvasElement.height = video.videoHeight;
            canvasElement.width = video.videoWidth;
            canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
            const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });

            if (code) {
                const qrData = code.data.split('|');
                if (qrData.length >= 6 && /^\d{12}$/.test(qrData[0])) {
                    document.getElementById('cccd-number').value = qrData[0];
                    document.getElementById('customer-name').value = qrData[2] && !/^\d+$/.test(qrData[2]) ? qrData[2] : '';
                    document.getElementById('customer-address').value = qrData[5] && qrData[5].includes(' ') ? qrData[5] : '';
                    document.getElementById('customer-nationality').value = 'Việt Nam';
                    showToast('Quét CCCD thành công!', 'success');
                    stopStream();
                    scanContainer.style.display = 'none';
                } else {
                    showToast('Dữ liệu CCCD không hợp lệ! Vui lòng thử lại.', 'error');
                    requestAnimationFrame(tick);
                }
            } else {
                requestAnimationFrame(tick);
            }
        } else {
            requestAnimationFrame(tick);
        }
    }

    function stopStream() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }

    stopScanButton.onclick = () => {
        stopStream();
        scanContainer.style.display = 'none';
        showToast('Đã dừng quét CCCD.', 'info');
    };

    cccdImageInput.onchange = function (e) {
        const file = e.target.files[0];
        if (!file) {
            showToast('Chưa chọn ảnh CCCD!', 'error');
            return;
        }

        const img = new Image();
        img.onload = function () {
            const maxSize = 1024;
            let width = img.width;
            let height = img.height;
            if (width > height && width > maxSize) {
                height *= maxSize / width;
                width = maxSize;
            } else if (height > maxSize) {
                width *= maxSize / height;
                height = maxSize;
            }
            canvasElement.width = width;
            canvasElement.height = height;
            canvas.drawImage(img, 0, 0, width, height);

            const imageData = canvas.getImageData(0, 0, width, height);
            const code = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });

            if (code) {
                const qrData = code.data.split('|');
                if (qrData.length >= 6 && /^\d{12}$/.test(qrData[0])) {
                    document.getElementById('cccd-number').value = qrData[0];
                    document.getElementById('customer-name').value = qrData[2] && !/^\d+$/.test(qrData[2]) ? qrData[2] : '';
                    document.getElementById('customer-address').value = qrData[5] && qrData[5].includes(' ') ? qrData[5] : '';
                    document.getElementById('customer-nationality').value = 'Việt Nam';
                    showToast('Quét CCCD từ ảnh thành công!', 'success');
                    scanContainer.style.display = 'none';
                } else {
                    showToast('Dữ liệu CCCD trong ảnh không hợp lệ!', 'error');
                }
            } else {
                showToast('Không tìm thấy mã QR trong ảnh!', 'error');
            }
            URL.revokeObjectURL(img.src);
        };
        img.onerror = () => showToast('Lỗi khi tải ảnh CCCD! Vui lòng thử lại.', 'error');
        img.src = URL.createObjectURL(file);
    };

    bookingModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-btn') || e.target.classList.contains('cancel-btn')) {
            stopStream();
            scanContainer.style.display = 'none';
        }
    }, { once: true });
}

// Book Room
async function bookRoom() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để đặt phòng!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const roomId = bookingRoomId.textContent;
    const bookingType = document.getElementById('booking-type').value;
    const cccdNumber = document.getElementById('cccd-number').value;
    const customerName = document.getElementById('customer-name').value;
    const customerAddress = document.getElementById('customer-address').value;
    const customerNationality = document.getElementById('customer-nationality').value;

    if (!roomId || isNaN(parseInt(roomId))) {
        showToast('Mã phòng không hợp lệ!', 'error');
        return;
    }

    if (!cccdNumber || !customerName || !customerAddress || !customerNationality) {
        showToast('Vui lòng nhập đầy đủ thông tin khách hàng!', 'error');
        return;
    }

    if (!/^\d{12}$/.test(cccdNumber)) {
        showToast('Số CCCD phải có đúng 12 chữ số!', 'error');
        return;
    }

    if (/^\d+$/.test(customerName)) {
        showToast('Tên khách hàng không được chỉ chứa số!', 'error');
        return;
    }

    if (customerAddress.length < 5) {
        showToast('Địa chỉ phải có ít nhất 5 ký tự!', 'error');
        return;
    }

    const bookingTypeMap = {
        'Theo giờ': 'TheoGio',
        'Theo ngày': 'TheoNgay',
        'Qua đêm': 'QuaDem'
    };
    const apiBookingType = bookingTypeMap[bookingType] || bookingType;

    await showConfirmDialog('Bạn có chắc muốn đặt phòng này không?', async () => {
        try {
            const response = await fetch('https://localhost:5001/api/KhachSanAPI/BookRoom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    maPhong: parseInt(roomId),
                    loaiGiayTo: 'CCCD',
                    soGiayTo: cccdNumber,
                    hoTen: customerName,
                    diaChi: customerAddress,
                    quocTich: customerNationality,
                    loaiDatPhong: apiBookingType
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`https error! Status: ${response.status}, Message: ${err.message || 'Không có thông tin lỗi'}`);
            }

            const data = await response.json();
            if (data.success) {
                const rooms = document.querySelectorAll('.room');
                const room = Array.from(rooms).find(r => r.getAttribute('data-room-id') === roomId);
                if (room) {
                    room.classList.add('occupied');
                    room.querySelector('.status').textContent = 'Đang sử dụng';
                    room.querySelector('.door-icon').classList.remove('fa-door-closed');
                    room.querySelector('.door-icon').classList.add('fa-door-open');
                    room.setAttribute('data-customer', customerName);
                    room.setAttribute('data-checkin', new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }));
                    room.setAttribute('data-datphong-id', data.maDatPhong);
                    closeBookingModal();
                    showToast('Đặt phòng thành công!', 'success');
                } else {
                    showToast('Không tìm thấy phòng để cập nhật trạng thái!', 'error');
                }
            } else {
                showToast(data.message || 'Có lỗi khi đặt phòng!', 'error');
            }
        } catch (error) {
            console.error('Lỗi khi đặt phòng:', error);
            handleApiError(error);
        }
    });
}

// Open Service Modal
async function openServiceModal() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để thêm dịch vụ!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const roomId = modalRoomId.textContent;
    serviceRoomId.textContent = roomId;

    try {
        const response = await fetch('https://localhost:5001/api/KhachSanAPI/GetServices', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error(`https error! Status: ${response.status}`);
        const data = await response.json();

        const serviceSelect = document.getElementById('service-name');
        serviceSelect.innerHTML = '';
        if (data.success) {
            data.services.forEach(service => {
                const option = document.createElement('option');
                option.value = `${service.maDichVu}|${service.gia}`;
                option.textContent = `${service.tenDichVu} - ${service.gia.toLocaleString('vi-VN')}đ`;
                serviceSelect.appendChild(option);
            });
            serviceModal.style.display = 'block';
        } else {
            showToast('Không thể tải danh sách dịch vụ!', 'error');
        }
    } catch (error) {
        console.error('Lỗi khi tải danh sách dịch vụ:', error);
        handleApiError(error);
    }
}

// Add Service
async function addService() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để thêm dịch vụ!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const roomId = serviceRoomId.textContent;
    const datPhongId = Array.from(document.querySelectorAll('.room')).find(r => r.getAttribute('data-room-id') === roomId)?.getAttribute('data-datphong-id');
    const serviceSelect = document.getElementById('service-name').value.split('|');
    const maDichVu = parseInt(serviceSelect[0]);
    const quantity = parseInt(document.getElementById('service-quantity').value);

    if (!datPhongId || isNaN(parseInt(datPhongId))) {
        Swal.fire({ title: 'Lỗi', text: 'Phòng chưa được đặt!', icon: 'error', confirmButtonText: 'OK' });
        return;
    }

    if (isNaN(maDichVu)) {
        Swal.fire({ title: 'Lỗi', text: 'Vui lòng chọn dịch vụ hợp lệ!', icon: 'error', confirmButtonText: 'OK' });
        return;
    }

    if (quantity <= 0) {
        Swal.fire({ title: 'Lỗi', text: 'Số lượng phải lớn hơn 0!', icon: 'error', confirmButtonText: 'OK' });
        return;
    }

    const payload = { maDatPhong: parseInt(datPhongId), maDichVu, soLuong: quantity };

    try {
        const response = await fetch('https://localhost:5001/api/KhachSanAPI/AddService', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`https error! Status: ${response.status}`);
        const data = await response.json();

        if (data.success) {
            closeServiceModal();
            Swal.fire({
                title: 'Thành công',
                text: 'Thêm dịch vụ thành công!',
                icon: 'success',
                confirmButtonText: 'OK'
            }).then(() => {
                if (billingModal.style.display === 'block') updateBillingServices(datPhongId);
            });
        } else {
            Swal.fire({ title: 'Lỗi', text: data.message || 'Có lỗi khi thêm dịch vụ!', icon: 'error', confirmButtonText: 'OK' });
        }
    } catch (error) {
        console.error('Lỗi khi thêm dịch vụ:', error);
        handleApiError(error);
    }
}

// Update Billing Services
async function updateBillingServices(datPhongId) {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để cập nhật dịch vụ!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`https://localhost:5001/api/KhachSanAPI/GetRoomServices?maDatPhong=${datPhongId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error(`https error! Status: ${response.status}`);
        const data = await response.json();

        if (data.success && data.services) {
            let totalServices = 0;
            billingServices.innerHTML = billingServices.querySelector('tr')?.outerHTML || '';
            data.services.forEach(service => {
                const thanhTien = Number(service.thanhTien) || 0;
                totalServices += thanhTien;
                billingServices.innerHTML += `
                    <tr>
                        <td>${service.maDichVu}</td>
                        <td>${service.tenDichVu}</td>
                        <td>-</td>
                        <td></td>
                        <td>${service.soLuong}</td>
                        <td>${service.donGia.toLocaleString('vi-VN')}đ</td>
                        <td>0%</td>
                        <td>${thanhTien.toLocaleString('vi-VN')}đ</td>
                        <td>-</td>
                    </tr>
                `;
            });
            billingTotalServices.textContent = totalServices.toLocaleString('vi-VN') + 'đ';
            const roomPrice = parseFloat(billingRoomPrice.textContent.replace(/[^0-9]/g, '') || '0');
            const tempTotal = roomPrice + totalServices;
            if (isNaN(tempTotal)) {
                showToast('Tổng tiền dịch vụ không hợp lệ!', 'error');
                return;
            }
            billingTotal.textContent = tempTotal.toLocaleString('vi-VN') + 'đ';
            billingFinal.textContent = tempTotal.toLocaleString('vi-VN') + 'đ';
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật dịch vụ:', error);
        handleApiError(error);
    }
}

// Process Payment
// Process Payment
async function processPayment() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để thanh toán!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const datPhongId = billingBillId.textContent;
    const note = billingNote.value;

    if (!datPhongId || isNaN(parseInt(datPhongId))) {
        showToast('Mã đặt phòng không hợp lệ!', 'error');
        return;
    }

    await showConfirmDialog('Bạn có chắc muốn thanh toán không?', async () => {
        try {
            const response = await fetch('https://localhost:5001/api/KhachSanAPI/ProcessPayment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    maDatPhong: parseInt(datPhongId),
                    ghiChu: note
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`https error! Status: ${response.status}, Message: ${err.message || 'Không có thông tin lỗi'}`);
            }

            const data = await response.json();
            if (data.success) {
                const rooms = document.querySelectorAll('.room');
                const room = Array.from(rooms).find(r => r.getAttribute('data-datphong-id') === datPhongId);
                if (room) {
                    room.classList.remove('occupied');
                    room.querySelector('.status').textContent = 'Trống';
                    room.querySelector('.door-icon').classList.remove('fa-door-open');
                    room.querySelector('.door-icon').classList.add('fa-door-closed');
                    room.removeAttribute('data-datphong-id');
                    room.removeAttribute('data-customer');
                    room.removeAttribute('data-checkin');
                    room.removeAttribute('data-staff');
                    room.removeAttribute('data-staff-id');
                }

                billingStatus.textContent = data.hoaDonTrangThaiThanhToan || 'Đã thanh toán';
                billingDatphongStatus.textContent = data.datPhongTrangThaiThanhToan || 'Đã thanh toán';
                billingRoomPrice.textContent = (data.tongTienPhong || 0).toLocaleString('vi-VN') + 'đ';
                billingTotal.textContent = (data.tongTien || 0).toLocaleString('vi-VN') + 'đ';
                billingFinal.textContent = (data.tongTien || 0).toLocaleString('vi-VN') + 'đ';

                Swal.fire({
                    title: 'Thành công!',
                    text: `Thanh toán thành công! Tổng tiền: ${(data.tongTien || 0).toLocaleString('vi-VN')}đ`,
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then(() => {
                    if (typeof loadGroups === 'function') loadGroups();
                });
            } else {
                Swal.fire({
                    title: 'Lỗi!',
                    text: data.message || 'Có lỗi khi thanh toán!',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        } catch (error) {
            console.error('Lỗi khi thanh toán:', error);
            Swal.fire({
                title: 'Lỗi!',
                text: `Đã xảy ra lỗi khi thanh toán: ${error.message}. Vui lòng kiểm tra dữ liệu phòng và ca làm việc!`,
                icon: 'error',
                confirmButtonText: 'OK'
            });
            handleApiError(error);
        }
    });
}

// Close Modals
function closeModal() { roomModal.style.display = 'none'; }
function closeBookingModal() { bookingModal.style.display = 'none'; }
function closeServiceModal() { serviceModal.style.display = 'none'; }
function closeBillingModal() { billingModal.style.display = 'none'; }

// Refresh Rooms
async function refreshRooms() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để làm mới danh sách phòng!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch('https://localhost:5001/api/PhongAPI/list?page=1', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error(`https error! Status: ${response.status}`);
        const data = await response.json();

        if (data.success && data.rooms) {
            const rooms = document.querySelectorAll('.room');
            for (const room of rooms) {
                const roomId = room.getAttribute('data-room-id');
                const roomData = data.rooms.find(r => r.maPhong.toString() === roomId);
                if (roomData) {
                    const bookingResponse = await fetch(`https://localhost:5001/api/KhachSanAPI/GetBookingDetailsByRoom/${roomId}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    const bookingData = await bookingResponse.json();
                    const isOccupied = roomData.dangSuDung || (bookingData.success && bookingData.maDatPhong);
                    const doorIcon = isOccupied ? 'fa-door-open' : 'fa-door-closed';
                    room.className = `room ${isOccupied ? 'occupied' : ''}`;
                    room.querySelector('.door-icon').className = `fa-solid ${doorIcon} door-icon`;
                    room.querySelector('.status').textContent = isOccupied ? 'Đang sử dụng' : 'Trống';
                    if (bookingData.success && bookingData.maDatPhong) {
                        room.setAttribute('data-datphong-id', bookingData.maDatPhong);
                        room.setAttribute('data-customer', bookingData.customer || '');
                        room.setAttribute('data-checkin', bookingData.ngayNhanPhong ? new Date(bookingData.ngayNhanPhong).toLocaleString('vi-VN') : '');
                    } else {
                        room.setAttribute('data-datphong-id', '');
                        room.removeAttribute('data-customer');
                        room.removeAttribute('data-checkin');
                    }
                }
            }
        } else {
            showToast(data.message || 'Không thể làm mới danh sách phòng!', 'error');
        }
    } catch (error) {
        console.error('Lỗi khi làm mới danh sách phòng:', error);
        handleApiError(error);
    }
}

// Gọi fetchStats khi trang tải
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để truy cập trang này!', 'warning');
        window.location.href = 'login.html';
        return;
    }
    fetchStats();
    loadRooms();
});

document.addEventListener('DOMContentLoaded', function () {
    // Gọi API để lấy thông tin người dùng
    fetchCurrentUser()
        .then(user => {
            // Lấy thông tin từ API hoặc fallback về localStorage
            const staffName = user?.hoTen || localStorage.getItem('hoTen') || 'N/A';
            const staffId = user?.maNhanVien || localStorage.getItem('maNhanVien') || 'N/A';

            // Cập nhật nội dung vào các span
            const staffNameElement = document.getElementById('staff-name');
            const staffIdElement = document.getElementById('staff-id');

            if (staffNameElement) {
                staffNameElement.textContent = staffName;
            }
            if (staffIdElement) {
                staffIdElement.textContent = staffId;
            }
        })
        .catch(error => {
            console.error('Lỗi khi lấy thông tin người dùng:', error);
            // Nếu có lỗi, hiển thị giá trị mặc định
            const staffNameElement = document.getElementById('staff-name');
            const staffIdElement = document.getElementById('staff-id');
            if (staffNameElement) staffNameElement.textContent = 'N/A';
            if (staffIdElement) staffIdElement.textContent = 'N/A';
        });
});
