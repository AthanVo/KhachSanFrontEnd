// Biến toàn cục để lưu dữ liệu nhóm
let groupsData = [];

// DOM Elements
const groupModal = document.getElementById('groupModal');
const mergeBillModal = document.getElementById('mergeBillModal');
const groupRoomSelection = document.getElementById('group-room-selection');
const mergeGroupId = document.getElementById('merge-group-id');
const mergeGroupName = document.getElementById('merge-group-name');
const mergeGroupRepresentative = document.getElementById('merge-group-representative');
const mergeGroupPhone = document.getElementById('merge-group-phone');
const mergeBillRooms = document.getElementById('merge-bill-rooms');
const mergeTotalServices = document.getElementById('merge-total-services');
const mergeTotalRoom = document.getElementById('merge-total-room');
const mergeTotal = document.getElementById('merge-total');
const groupSelect = document.getElementById('group-select');
const mergeRentalDays = document.getElementById('merge-rental-days');


function saveGroupData() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        showToast('Bạn cần đăng nhập để lưu thông tin khách!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const customerTable = document.getElementById('customer-table').querySelector('tbody');
    const customers = Array.from(customerTable.rows).map(row => ({
        soGiayTo: row.cells[3].textContent,
        hoTen: row.cells[1].textContent,
        gioiTinh: row.cells[2].textContent,
        diaChi: 'N/A',
        quocTich: 'Việt Nam'
    }));

    const roomAssignments = Object.entries(currentRoomCustomers).map(([maPhong, customers]) => ({
        maPhong: parseInt(maPhong),
        customers: customers.map(c => ({
            soGiayTo: c.cccd,
            hoTen: c.name,
            gioiTinh: c.gender,
            diaChi: 'N/A',
            quocTich: 'Việt Nam'
        }))
    }));

    const customersWithoutRoom = customers.filter(customer =>
        !roomAssignments.some(r => r.customers.some(c => c.soGiayTo === customer.soGiayTo))
    );

    if (customersWithoutRoom.length > 0) {
        const customerNames = customersWithoutRoom.map(c => c.hoTen).join(', ');
        showToast(`Vui lòng phân phòng cho các khách sau trước khi lưu: ${customerNames}`, 'error');
        return;
    }

    const checkinDate = document.getElementById('checkin-date').value;
    if (!checkinDate) {
        showToast('Vui lòng nhập ngày nhận phòng trước khi lưu khách!', 'error');
        return;
    }

    // Kiểm tra định dạng ngày
    const today = new Date().toISOString().split('T')[0];
    if (checkinDate < today) {
        showToast('Ngày nhận phòng phải từ hôm nay trở đi!', 'error');
        return;
    }

    Swal.fire({
        title: 'Đang lưu...',
        text: 'Vui lòng đợi trong giây lát.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const customerPromises = customers.concat(...roomAssignments.flatMap(r => r.customers))
        .filter((c, i, arr) => arr.findIndex(x => x.soGiayTo === c.soGiayTo) === i)
        .map(customer => {
            const matchingRoom = roomAssignments.find(r => r.customers.some(c => c.soGiayTo === customer.soGiayTo));
            const maPhong = matchingRoom ? matchingRoom.maPhong : null;

            if (!maPhong) {
                showToast(`Khách ${customer.hoTen} chưa được gán phòng!`, 'error');
                throw new Error(`Khách ${customer.hoTen} chưa được gán phòng`);
            }

            return fetch('https://localhost:5001/api/KhachSanAPI/BookRoom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    MaPhong: maPhong,
                    LoaiGiayTo: 'CCCD',
                    SoGiayTo: customer.soGiayTo,
                    HoTen: customer.hoTen,
                    DiaChi: customer.diaChi,
                    QuocTich: customer.quocTich,
                    LoaiDatPhong: 'Theo ngày',
                    NgayNhanPhongDuKien: checkinDate
                })
            })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            try {
                                const err = JSON.parse(text);
                                throw new Error(err.message || `HTTP error! Status: ${response.status}`);
                            } catch {
                                throw new Error(`HTTP error! Status: ${response.status}, Response: ${text || 'No content'}`);
                            }
                        });
                    }
                    return response.json();
                })
                .then(data => ({ success: data.success, maDatPhong: data.maDatPhong, customer, maPhong }));
        });

    Promise.all(customerPromises)
        .then(results => {
            const failed = results.filter(r => !r.success);
            if (failed.length > 0) {
                Swal.close();
                showToast('Lỗi khi lưu một số khách!', 'error');
                return;
            }

            const updatePromises = results.map(result => {
                return fetch('https://localhost:5001/api/KhachSanAPI/UpdateDatPhongGroup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        MaDatPhong: result.maDatPhong,
                        MaNhomDatPhong: parseInt(maNhomDatPhong)
                    })
                })
                    .then(response => {
                        if (!response.ok) {
                            return response.text().then(text => {
                                try {
                                    const err = JSON.parse(text);
                                    throw new Error(err.message || `HTTP error! Status: ${response.status}`);
                                } catch {
                                    throw new Error(`HTTP error! Status: ${response.status}, Response: ${text || 'No content'}`);
                                }
                            });
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (!data.success) throw new Error(data.message || 'Lỗi khi cập nhật nhóm cho đặt phòng');
                        return result;
                    });
            });

            return Promise.all(updatePromises);
        })
        .then(results => {
            Swal.close();
            showToast('Lưu thông tin khách thành công!', 'success');
            currentRoomCustomers = {};
            window.location.href = '/khachsan.html';
            setTimeout(() => {
                if (window.opener && window.opener.refreshRooms) {
                    window.opener.refreshRooms();
                }
            }, 500);
        })
        .catch(error => {
            Swal.close();
            console.error('Lỗi khi lưu dữ liệu:', error);
            showToast(`Lỗi khi lưu dữ liệu: ${error.message}`, 'error');
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

// Tải danh sách nhóm từ backend
function loadGroups() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để tải danh sách nhóm!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    fetch('https://localhost:5001/api/KhachSanAPI/groups', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Debug: In ra dữ liệu thô từ API
                console.log('Raw groups data from API:', data.groups);

                // Kiểm tra số lượng phòng occupied trong DOM
                const occupiedRooms = document.querySelectorAll('.room.occupied');
                console.log('Occupied rooms in DOM:', occupiedRooms.length);

                // Lọc nhóm với logic cải tiến
                groupsData = data.groups
                    .filter(group => {
                        // Kiểm tra nhóm có dữ liệu hợp lệ
                        if (!group.rooms || group.rooms.length === 0) {
                            console.log(`Group ${group.id} (${group.name}): Không có phòng`);
                            return false;
                        }

                        // Kiểm tra xem có phòng nào của nhóm đang occupied
                        const hasOccupiedRoom = group.rooms.some(roomId => {
                            const room = document.querySelector(`.room[data-room-id="${roomId}"]`);
                            const isOccupied = room && room.classList.contains('occupied');
                            console.log(`  - Room ${roomId}: ${room ? 'Tồn tại' : 'Không tồn tại'}, Occupied: ${isOccupied}`);
                            return isOccupied;
                        });

                        // Kiểm tra nhóm có datPhongs (đã có đặt phòng)
                        const hasDatPhongs = group.datPhongs && group.datPhongs.length > 0;

                        console.log(`Group ${group.id} (${group.name}): hasOccupiedRoom=${hasOccupiedRoom}, hasDatPhongs=${hasDatPhongs}`);

                        // Trả về true nếu có phòng occupied HOẶC có datPhongs (cho phép gộp hóa đơn cho nhóm đã checkout)
                        return hasOccupiedRoom || hasDatPhongs;
                    })
                    .map(group => ({
                        id: group.id,
                        name: group.name,
                        representative: group.representative,
                        phone: group.phone,
                        ngayNhanPhong: group.ngayNhanPhong,
                        ngayTraPhong: group.ngayTraPhong,
                        rooms: group.rooms,
                        datPhongs: group.datPhongs || []
                    }))
                    .sort((a, b) => a.id - b.id);

                console.log('Filtered groups data:', groupsData);
                console.log('Total groups available for merge:', groupsData.length);

                updateGroupSelect();
            } else {
                console.error('API response not successful:', data);
                showToast(data.message || 'Không thể tải danh sách nhóm!', 'error');
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải danh sách nhóm:', error);
            if (error.message.includes('401')) {
                showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
                localStorage.removeItem('jwtToken');
                localStorage.removeItem('username');
                localStorage.removeItem('vaitro');
                window.location.href = 'login.html';
            } else {
                showToast('Lỗi khi tải danh sách nhóm: ' + error.message, 'error');
            }
        });
}

// Mở modal thêm vào nhóm
function openGroupModal() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để mở modal thêm nhóm!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    // Xóa logic liên quan đến group-room-selection
    document.getElementById('group-name').value = '';
    document.getElementById('group-representative').value = '';
    document.getElementById('group-phone').value = '';
    groupModal.style.display = 'block';
}

// Thêm vào nhóm
function addToGroup() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để thêm nhóm!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const groupName = document.getElementById('group-name').value.trim();
    const representative = document.getElementById('group-representative').value.trim();
    const phone = document.getElementById('group-phone').value.trim();

    if (!groupName || !representative || !phone) {
        showToast('Vui lòng nhập đầy đủ thông tin đoàn!', 'error');
        return;
    }

    if (!/^\d{10,11}$/.test(phone)) {
        showToast('Số điện thoại phải có 10-11 số!', 'error');
        return;
    }

    fetch('https://localhost:5001/api/KhachSanAPI/groups', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.groups.some(group => group.name === groupName)) {
                Swal.fire({
                    title: 'Tên nhóm đã tồn tại',
                    text: 'Tên đoàn này đã được sử dụng. Bạn có muốn tiếp tục tạo nhóm mới không?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Có, tiếp tục',
                    cancelButtonText: 'Hủy'
                }).then((result) => {
                    if (result.isConfirmed) {
                        createGroup(groupName, representative, phone);
                    }
                });
            } else {
                createGroup(groupName, representative, phone);
            }
        })
        .catch(error => {
            console.error('Lỗi khi kiểm tra tên nhóm:', error);
            showToast('Lỗi khi kiểm tra tên nhóm: ' + error.message, 'error');
        });
}

function createGroup(groupName, representative, phone) {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        showToast('Bạn cần đăng nhập để tạo nhóm!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    Swal.fire({
        title: 'Xác nhận tạo đoàn',
        text: 'Bạn có chắc muốn tạo đoàn này không?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Có, tạo đoàn',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('https://localhost:5001/api/KhachSanAPI/add-group', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    TenNhom: groupName,
                    HoTenNguoiDaiDien: representative,
                    SoDienThoaiNguoiDaiDien: phone,
                    MaPhong: [] // Gửi mảng rỗng vì không chọn phòng
                })
            })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            try {
                                const err = JSON.parse(text);
                                throw new Error(err.message || `HTTP error! Status: ${response.status}`);
                            } catch {
                                throw new Error(`HTTP error! Status: ${response.status}, Response: ${text || 'No content'}`);
                            }
                        });
                    }
                    return response.text().then(text => {
                        return text ? JSON.parse(text) : {};
                    });
                })
                .then(data => {
                    if (data.success) {
                        closeGroupModal();
                        showToast(`Tạo đoàn thành công! Mã nhóm: ${data.maNhomDatPhong}`, 'success');
                        loadGroups();
                    } else {
                        showToast(data.message || 'Có lỗi khi tạo đoàn!', 'error');
                    }
                })
                .catch(error => {
                    console.error('Lỗi khi tạo đoàn:', error);
                    const errorMessage = error.message.includes('HTTP error')
                        ? error.message
                        : `Lỗi khi tạo đoàn: ${error.message || 'Không xác định'}`;
                    showToast(errorMessage, 'error');
                });
        }
    });
}

// Mở modal gộp hóa đơn
function openMergeBillModal() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để mở modal gộp hóa đơn!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    if (groupsData.length === 0) {
        showToast('Chưa có nhóm nào để gộp hóa đơn!', 'error');
        return;
    }

    updateGroupSelect();
    updateMergeBillDetails();
    mergeBillModal.style.display = 'block';
}

// Cập nhật danh sách nhóm trong dropdown
function updateGroupSelect() {
    groupSelect.innerHTML = groupsData.map(group =>
        `<option value="${group.id}">${group.name} (ID: ${group.id})</option>`
    ).join('');
    if (groupsData.length === 0) {
        groupSelect.innerHTML = '<option value="">Không có nhóm nào</option>';
    }
}

// Cập nhật chi tiết gộp hóa đơn dựa trên nhóm được chọn
function updateMergeBillDetails() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để xem chi tiết gộp hóa đơn!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const selectedGroupId = parseInt(groupSelect.value);
    const group = groupsData.find(g => g.id === selectedGroupId);
    if (!group) {
        showToast('Không tìm thấy nhóm được chọn!', 'error');
        return;
    }

    // Populate group information
    mergeGroupId.textContent = group.id;
    mergeGroupName.textContent = group.name || 'N/A';
    mergeGroupRepresentative.textContent = group.representative || 'N/A';
    mergeGroupPhone.textContent = group.phone || 'N/A';

    // Calculate rental days từ thông tin nhóm
    let globalRentalDays = 'N/A';
    if (group.ngayNhanPhong && group.ngayTraPhong) {
        try {
            const checkInDate = new Date(group.ngayNhanPhong);
            const checkOutDate = new Date(group.ngayTraPhong);
            const timeDiff = checkOutDate - checkInDate;
            globalRentalDays = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
            console.log('Global rental days:', globalRentalDays);
        } catch (error) {
            console.error('Lỗi khi tính số ngày thuê:', error);
            globalRentalDays = 1; // Default to 1 day
        }
    }
    mergeRentalDays.textContent = globalRentalDays !== 'N/A' ? globalRentalDays : 'N/A';

    // Fetch room services
    const url = `https://localhost:5001/api/KhachSanAPI/GetRoomServices?${group.datPhongs.map(datPhongId => `maDatPhong=${datPhongId}`).join('&')}`;
    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                mergeBillRooms.innerHTML = '';
                let totalServices = 0;
                let totalRoom = 0;
                const rooms = document.querySelectorAll('.room');

                group.rooms.forEach(roomId => {
                    const room = Array.from(rooms).find(r => r.getAttribute('data-room-id') === roomId.toString());
                    if (room) {
                        const basePrice = parseInt(room.getAttribute('data-price')?.replace(/[^0-9]/g, '') || '0');
                        const billId = room.getAttribute('data-bill-id') || 'N/A';
                        const datPhongId = room.getAttribute('data-datphong-id');

                        console.log(`Room ${roomId} - Base price: ${basePrice}`);

                        // Tính số ngày thuê cho từng phòng
                        let days = globalRentalDays !== 'N/A' ? globalRentalDays : 1;

                        // Nếu có thông tin checkin/checkout riêng cho phòng thì ưu tiên
                        const roomCheckin = room.getAttribute('data-checkin');
                        const roomCheckout = room.getAttribute('data-checkout');

                        if (roomCheckin && roomCheckout) {
                            try {
                                const checkInDate = new Date(roomCheckin);
                                const checkOutDate = new Date(roomCheckout);
                                const timeDiff = checkOutDate - checkInDate;
                                days = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
                                console.log(`Room ${roomId} - Individual days: ${days}`);
                            } catch (error) {
                                console.error(`Lỗi khi tính ngày cho phòng ${roomId}:`, error);
                                // Fallback to global days
                            }
                        }

                        // Tính tổng tiền phòng = giá cơ bản * số ngày
                        const roomPrice = basePrice * days;
                        const displayText = `${roomPrice.toLocaleString()}đ (${days} ngày × ${basePrice.toLocaleString()}đ)`;

                        console.log(`Room ${roomId} - Final price: ${roomPrice} (${days} days × ${basePrice})`);

                        // Filter services for this room
                        const services = data.services.filter(s => s.maDatPhong === parseInt(datPhongId));
                        const roomServicesTotal = services.reduce((sum, s) => sum + (s.thanhTien || 0), 0);
                        // Get service names as a comma-separated string
                        const serviceNames = services.map(s => s.tenDichVu || 'N/A').join(', ') || 'Không có dịch vụ';

                        totalServices += roomServicesTotal;
                        totalRoom += roomPrice; // Sử dụng roomPrice đã tính toán

                        // Render table row with service names
                        mergeBillRooms.innerHTML += `
                            <tr>
                                <td>${roomId}</td>
                                <td>${billId}</td>
                                <td>${displayText}</td>
                                <td>${serviceNames}</td>
                                <td>${roomServicesTotal.toLocaleString()}đ</td>
                                <td>${(roomPrice + roomServicesTotal).toLocaleString()}đ</td>
                            </tr>
                        `;
                    }
                });

                console.log('Total room cost:', totalRoom);
                console.log('Total services cost:', totalServices);
                console.log('Grand total:', totalRoom + totalServices);

                // Update summary
                mergeTotalServices.textContent = totalServices.toLocaleString() + 'đ';
                mergeTotalRoom.textContent = totalRoom.toLocaleString() + 'đ';
                mergeTotal.textContent = (totalServices + totalRoom).toLocaleString() + 'đ';
            } else {
                showToast(data.message || 'Không thể tải dịch vụ!', 'error');
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải dịch vụ cho nhóm:', error);
            if (error.message.includes('401')) {
                showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
                localStorage.removeItem('jwtToken');
                localStorage.removeItem('username');
                localStorage.removeItem('vaitro');
                window.location.href = 'login.html';
            } else {
                showToast('Lỗi khi tải dữ liệu gộp hóa đơn: ' + error.message, 'error');
            }
        });
}

// Đóng modal thêm vào nhóm
function closeGroupModal() {
    groupModal.style.display = 'none';
}

// Đóng modal gộp hóa đơn
function closeMergeBillModal() {
    mergeBillModal.style.display = 'none';
}

// Gộp hóa đơn
function mergeBill() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để gộp hóa đơn!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const groupId = parseInt(groupSelect.value);
    const note = "Gộp hóa đơn cho nhóm " + mergeGroupName.textContent;
    const total = mergeTotal.textContent;

    if (isNaN(groupId) || groupId <= 0) {
        showToast('Mã nhóm đặt phòng không hợp lệ!', 'error');
        return;
    }

    Swal.fire({
        title: 'Xác nhận thanh toán',
        html: `Bạn có chắc muốn thanh toán hóa đơn cho nhóm <strong>${mergeGroupName.textContent}</strong>?<br>Tổng tiền: <strong>${total}</strong>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Có, thanh toán',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            const payload = {
                MaNhomDatPhong: groupId,
                GhiChu: note
            };

            console.log('Dữ liệu gửi lên:', payload);

            fetch('https://localhost:5001/api/KhachSanAPI/merge-bill', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            throw new Error(`HTTP error! Status: ${response.status}, Message: ${err.message || 'Không có thông báo lỗi'}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        showToast(data.message, 'success');
                        closeMergeBillModal();
                        const rooms = document.querySelectorAll('.room');
                        groupsData.find(g => g.id === groupId).rooms.forEach(roomId => {
                            const room = Array.from(rooms).find(r => r.getAttribute('data-room-id') === roomId);
                            if (room) {
                                room.classList.remove('occupied');
                                room.querySelector('.status').textContent = 'Trống';
                                room.querySelector('.door-icon').classList.remove('fa-door-open');
                                room.querySelector('.door-icon').classList.add('fa-door-closed');
                                room.removeAttribute('data-datphong-id');
                            }
                        });
                        groupsData = groupsData.filter(g => g.id !== groupId);
                        updateGroupSelect();
                    } else {
                        showToast(data.message || 'Có lỗi khi gộp hóa đơn!', 'error');
                    }
                })
                .catch(error => {
                    console.error('Lỗi khi gộp hóa đơn:', error);
                    if (error.message.includes('401')) {
                        showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
                        localStorage.removeItem('jwtToken');
                        localStorage.removeItem('username');
                        localStorage.removeItem('vaitro');
                        window.location.href = 'login.html';
                    } else {
                        showToast('Lỗi khi gộp hóa đơn: ' + error.message, 'error');
                    }
                });
        }
    });
}

// Hàm phụ để cập nhật MaNhomDatPhong trong DatPhong
function updateDatPhongWithGroup(datPhongId, maNhomDatPhong) {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để cập nhật nhóm đặt phòng!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    fetch('https://localhost:5001/api/KhachSanAPI/UpdateDatPhongGroup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            MaDatPhong: parseInt(datPhongId),
            MaNhomDatPhong: maNhomDatPhong
        })
    })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                console.warn(`Không thể cập nhật DatPhong ${datPhongId} với MaNhomDatPhong ${maNhomDatPhong}: ${data.message}`);
            } else {
                console.log(`Đã cập nhật DatPhong ${datPhongId} với MaNhomDatPhong ${maNhomDatPhong}`);
            }
        })
        .catch(error => {
            console.error('Lỗi khi cập nhật DatPhong:', error);
            if (error.message.includes('401')) {
                showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
                localStorage.removeItem('jwtToken');
                localStorage.removeItem('username');
                localStorage.removeItem('vaitro');
                window.location.href = 'login.html';
            } else {
                showToast('Lỗi khi liên kết phòng với nhóm: ' + error.message, 'error');
            }
        });
}

function redirectToGroupManagement() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để quản lý nhóm!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    fetch('https://localhost:5001/api/KhachSanAPI/groups', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success && data.groups && data.groups.length > 0) {
                Swal.fire({
                    title: 'Chọn nhóm',
                    input: 'select',
                    inputOptions: data.groups.reduce((options, group) => {
                        options[group.id] = group.name;
                        return options;
                    }, {}),
                    inputPlaceholder: 'Chọn một nhóm',
                    showCancelButton: true,
                    confirmButtonText: 'Tiếp tục',
                    cancelButtonText: 'Hủy',
                    inputValidator: (value) => {
                        if (!value) {
                            return 'Vui lòng chọn một nhóm!';
                        }
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        const maNhomDatPhong = result.value;
                        // Chuyển hướng đến NhomDatPhong.html với query parameter
                        window.location.href = `groupmanagement.html?maNhomDatPhong=${maNhomDatPhong}`;
                    }
                });
            } else {
                showToast('Không có nhóm nào để chọn! Vui lòng tạo nhóm trước.', 'error');
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải danh sách nhóm:', error);
            if (error.message.includes('401')) {
                showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
                localStorage.removeItem('jwtToken');
                localStorage.removeItem('username');
                localStorage.removeItem('vaitro');
                window.location.href = 'login.html';
            } else {
                showToast('Lỗi khi tải danh sách nhóm: ' + error.message, 'error');
            }
        });
}

// Khởi tạo khi trang tải
document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để tải danh sách nhóm!', 'warning');
        window.location.href = 'login.html';
        return;
    }
    loadGroups();
});

let maNhomDatPhong = null;
let currentRoomCustomers = {};

// Hàm phát giọng nói
function speak(message) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'vi-VN';
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        window.speechSynthesis.speak(utterance);

        utterance.onerror = (event) => {
            console.error('Lỗi phát giọng nói:', event.error);
            if (event.error === 'not-allowed' || event.error === 'language-not-supported') {
                const fallbackUtterance = new SpeechSynthesisUtterance(message);
                fallbackUtterance.lang = 'en-US';
                window.speechSynthesis.speak(fallbackUtterance);
            }
        };
    } else {
        console.warn('Trình duyệt không hỗ trợ Web Speech API!');
        showToast('Trình duyệt không hỗ trợ phát giọng nói!', 'warning');
    }
}

// Get query parameter
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Show toast notification
function showToast(message, type = 'success') {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: type,
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

// Kiểm tra token JWT
function checkToken() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        showToast('Phiên đăng nhập hết hạn! Vui lòng đăng nhập lại.', 'error');
        speak('Phiên đăng nhập hết hạn! Vui lòng đăng nhập lại.');
        setTimeout(() => window.location.href = 'login.html', 2000);
        return false;
    }
    return token;
}

// Load group information
function loadGroupInfo() {
    maNhomDatPhong = getQueryParam('maNhomDatPhong');
    if (!maNhomDatPhong) {
        showToast('Không tìm thấy thông tin đoàn! Vui lòng chọn nhóm trước.', 'error');
        speak('Không tìm thấy thông tin đoàn! Vui lòng chọn nhóm trước.');
        setTimeout(() => {
            window.location.href = '/KhachSan';
        }, 2000);
        return;
    }

    currentRoomCustomers = {};

    const token = checkToken();
    if (!token) return;

    fetch(`http://localhost:5000/api/KhachSanAPI/groups`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Phiên đăng nhập hết hạn!');
                } else if (response.status === 404) {
                    throw new Error('Không tìm thấy endpoint /groups.');
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.groups) {
                const group = data.groups.find(g => g.id == maNhomDatPhong);
                if (group) {
                    document.getElementById('group-name').value = group.name || '';
                    document.getElementById('group-representative').value = group.representative || '';
                    document.getElementById('group-phone').value = group.phone || '';
                    loadAvailableRooms();
                    loadAssignedRooms();
                } else {
                    throw new Error('Không tìm thấy đoàn!');
                }
            } else {
                throw new Error('Không thể tải thông tin đoàn!');
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải thông tin đoàn:', error);
            showToast('Lỗi khi tải thông tin đoàn: ' + error.message, 'error');
            speak('Lỗi khi tải thông tin đoàn: ' + error.message);
            setTimeout(() => {
                window.location.href = '/KhachSan';
            }, 2000);
        });
}

// Load available rooms for customer assignment
function loadAvailableRooms() {
    const token = checkToken();
    if (!token) return;

    fetch('http://localhost:5000/api/KhachSanAPI/GetRooms', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || `HTTP error! Status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            const roomSelect = document.getElementById('room-select');
            roomSelect.innerHTML = '<option value="">-- Chọn phòng --</option>';
            if (data.success && data.rooms) {
                fetch(`http://localhost:5000/api/KhachSanAPI/groups`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    credentials: 'include'
                })
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                        return response.json();
                    })
                    .then(groupData => {
                        const group = groupData.groups.find(g => g.id == maNhomDatPhong);
                        const assignedRoomIds = group.rooms || [];
                        data.rooms.forEach(room => {
                            if (assignedRoomIds.includes(room.maPhong.toString()) && !room.dangSuDung) {
                                const option = document.createElement('option');
                                option.value = room.maPhong;
                                option.textContent = `${room.soPhong} (${room.trangThai})`;
                                roomSelect.appendChild(option);
                            }
                        });
                        if (roomSelect.options.length === 1) {
                            showToast('Không có phòng nào khả dụng để phân bổ khách!', 'warning');
                            speak('Không có phòng nào khả dụng để phân bổ khách!');
                        }
                    })
                    .catch(error => {
                        console.error('Lỗi khi tải thông tin nhóm:', error);
                        showToast('Lỗi khi tải thông tin nhóm: ' + error.message, 'error');
                        speak('Lỗi khi tải thông tin nhóm: ' + error.message);
                    });
            } else {
                showToast('Không thể tải danh sách phòng!', 'error');
                speak('Không thể tải danh sách phòng!');
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải danh sách phòng:', error);
            showToast('Lỗi khi tải danh sách phòng: ' + error.message, 'error');
            speak('Lỗi khi tải danh sách phòng: ' + error.message);
        });
}

// Load rooms already assigned to the group
function loadAssignedRooms() {
    const token = checkToken();
    if (!token) return;

    fetch(`http://localhost:5000/api/KhachSanAPI/groups`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            const group = data.groups.find(g => g.id == maNhomDatPhong);
            const assignedRoomIds = group.rooms || [];

            fetch('http://localhost:5000/api/KhachSanAPI/GetRooms', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            throw new Error(err.message || `HTTP error! Status: ${response.status}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    const roomSelection = document.getElementById('room-selection');
                    roomSelection.innerHTML = '';
                    if (data.success && data.rooms) {
                        data.rooms.forEach(room => {
                            if (!room.dangSuDung) {
                                const div = document.createElement('div');
                                div.className = 'room-checkbox';
                                const isChecked = assignedRoomIds.includes(room.maPhong.toString());
                                div.innerHTML = `
                                            <input type="checkbox" id="room-${room.maPhong}" value="${room.maPhong}" ${isChecked ? 'checked' : ''}>
                                            <label for="room-${room.maPhong}">${room.soPhong} (${room.trangThai})</label>
                                        `;
                                roomSelection.appendChild(div);
                            }
                        });
                        if (roomSelection.children.length === 0) {
                            showToast('Không có phòng trống nào để chọn!', 'warning');
                            speak('Không có phòng trống nào để chọn!');
                        }
                    } else {
                        showToast('Không thể tải danh sách phòng!', 'error');
                        speak('Không thể tải danh sách phòng!');
                    }
                })
                .catch(error => {
                    console.error('Lỗi khi tải danh sách phòng:', error);
                    showToast('Lỗi khi tải danh sách phòng: ' + error.message, 'error');
                    speak('Lỗi khi tải danh sách phòng: ' + error.message);
                });
        })
        .catch(error => {
            console.error('Lỗi khi tải thông tin nhóm:', error);
            showToast('Lỗi khi tải thông tin nhóm: ' + error.message, 'error');
            speak('Lỗi khi tải thông tin nhóm: ' + error.message);
        });
}

// Save rooms for group
function saveRoomsForGroup() {
    const token = checkToken();
    if (!token) return;

    const roomSelection = document.getElementById('room-selection');
    const selectedRooms = Array.from(roomSelection.querySelectorAll('input[type="checkbox"]:checked'))
        .map(checkbox => parseInt(checkbox.value));

    if (selectedRooms.length === 0) {
        showToast('Vui lòng chọn ít nhất một phòng!', 'error');
        speak('Vui lòng chọn ít nhất một phòng!');
        return;
    }

    const checkinDate = document.getElementById('checkin-date').value;
    const checkoutDate = document.getElementById('checkout-date').value;

    if (!checkinDate || !checkoutDate) {
        showToast('Vui lòng nhập đầy đủ ngày nhận phòng và ngày trả phòng!', 'error');
        speak('Vui lòng nhập đầy đủ ngày nhận phòng và ngày trả phòng!');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (checkinDate < today) {
        showToast('Ngày nhận phòng phải từ hôm nay trở đi!', 'error');
        speak('Ngày nhận phòng phải từ hôm nay trở đi!');
        return;
    }

    if (checkoutDate <= checkinDate) {
        showToast('Ngày trả phòng phải sau ngày nhận phòng!', 'error');
        speak('Ngày trả phòng phải sau ngày nhận phòng!');
        return;
    }

    Swal.fire({
        title: 'Xác nhận lưu phòng',
        text: 'Bạn có chắc muốn liên kết các phòng này với nhóm không?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Có, lưu',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('http://localhost:5000/api/KhachSanAPI/add-group', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    TenNhom: document.getElementById('group-name').value.trim(),
                    HoTenNguoiDaiDien: document.getElementById('group-representative').value.trim(),
                    SoDienThoaiNguoiDaiDien: document.getElementById('group-phone').value.trim(),
                    MaPhong: selectedRooms,
                    NgayNhanPhong: checkinDate,
                    NgayTraPhong: checkoutDate
                })
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            throw new Error(err.message || `HTTP error! Status: ${response.status}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        showToast('Liên kết phòng với nhóm thành công!', 'success');
                        speak('Liên kết phòng với nhóm thành công!');
                        loadAvailableRooms();
                    } else {
                        showToast(data.message || 'Lỗi khi liên kết phòng với nhóm!', 'error');
                        speak(data.message || 'Lỗi khi liên kết phòng với nhóm!');
                    }
                })
                .catch(error => {
                    console.error('Lỗi khi liên kết phòng với nhóm:', error);
                    showToast('Lỗi khi liên kết phòng với nhóm: ' + error.message, 'error');
                    speak('Lỗi khi liên kết phòng với nhóm: ' + error.message);
                });
        }
    });
}

// Scan CCCD
function scanCCCD() {
    toggleScanMode();
    const scanContainer = document.createElement('div');
    scanContainer.id = 'scan-container';
    scanContainer.style.cssText = 'display: block; margin-top: 10px; position: relative; text-align: center;';
    scanContainer.innerHTML = `
                <div style="position: relative; display: inline-block;">
                    <video id="video" width="300" height="200" autoplay style="border-radius: 4px; border: 1px solid #ccc;"></video>
                    <div style="position: absolute; top: 10%; left: 10%; width: 80%; height: 80%; border: 2px dashed #00ff00; opacity: 0.7; pointer-events: none;"></div>
                    <p style="margin: 5px 0; color: #333; font-size: 14px;">Đặt mã QR trên CCCD vào khung</p>
                </div>
                <canvas id="canvas" style="display: none;"></canvas>
                <button id="stop-scan" style="margin-top: 5px; background: #d33; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Dừng quét</button>
                <input type="file" id="cccd-image" accept="image/*" style="margin-top: 5px;" title="Tải ảnh CCCD nếu webcam không hoạt động">
            `;
    document.querySelector('.qr-section').appendChild(scanContainer);

    const video = document.getElementById('video');
    const canvasElement = document.getElementById('canvas');
    const canvas = canvasElement.getContext('2d', { willReadFrequently: true });
    const stopScanButton = document.getElementById('stop-scan');
    const cccdImageInput = document.getElementById('cccd-image');
    let stream = null;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Trình duyệt không hỗ trợ truy cập camera!', 'error');
        speak('Trình duyệt không hỗ trợ truy cập camera!');
        scanContainer.remove();
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(mediaStream => {
            stream = mediaStream;
            video.srcObject = stream;
            video.play().catch(err => {
                showToast('Không thể khởi động camera: ' + err.message, 'error');
                speak('Không thể khởi động camera: ' + err.message);
                stopStream();
                scanContainer.remove();
            });
            requestAnimationFrame(tick);
        })
        .catch(err => {
            let errorMessage = 'Không thể truy cập camera: ' + err.message;
            if (err.name === 'NotAllowedError') {
                errorMessage = 'Vui lòng cấp quyền sử dụng camera!';
            } else if (err.name === 'NotFoundError') {
                errorMessage = 'Không tìm thấy webcam! Hãy thử tải ảnh CCCD hoặc nhập thủ công.';
            } else if (err.name === 'NotReadableError') {
                errorMessage = 'Webcam đang được sử dụng bởi ứng dụng khác!';
            }
            showToast(errorMessage, 'error');
            speak(errorMessage);
            scanContainer.remove();
        });

    function tick() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvasElement.height = video.videoHeight;
            canvasElement.width = video.videoWidth;
            canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
            const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth'
            });

            if (code) {
                console.log('QR Data:', code.data);
                const qrData = code.data.split('|');
                if (qrData.length >= 6 && /^\d{12}$/.test(qrData[0])) {
                    document.getElementById('cccd-number').textContent = qrData[0];
                    document.getElementById('customer-name').textContent = qrData[2] && !/^\d+$/.test(qrData[2]) ? qrData[2] : '';
                    document.getElementById('customer-address').textContent = qrData[5] && qrData[5].includes(' ') ? qrData[5] : '';
                    document.getElementById('customer-nationality').textContent = 'Việt Nam';
                    document.getElementById('customer-gender').textContent = 'Nam';
                    showToast('Quét CCCD thành công!', 'success');
                    speak('Quét CCCD thành công!');
                    stopStream();
                    scanContainer.remove();
                } else {
                    showToast('Dữ liệu CCCD không hợp lệ!', 'error');
                    speak('Dữ liệu CCCD không hợp lệ!');
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
        scanContainer.remove();
        showToast('Đã dừng quét CCCD.', 'info');
        speak('Đã dừng quét CCCD.');
    };

    cccdImageInput.onchange = function (e) {
        const file = e.target.files[0];
        if (!file) {
            showToast('Chưa chọn ảnh CCCD!', 'error');
            speak('Chưa chọn ảnh CCCD!');
            return;
        }

        const img = new Image();
        img.onload = function () {
            const maxSize = 1024;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }
            canvasElement.width = width;
            canvasElement.height = height;
            canvas.drawImage(img, 0, 0, width, height);

            const imageData = canvas.getImageData(0, 0, width, height);
            const code = jsQR(imageData.data, width, height, {
                inversionAttempts: 'attemptBoth'
            });

            if (code) {
                console.log('QR Data from Image:', code.data);
                const qrData = code.data.split('|');
                if (qrData.length >= 6 && /^\d{12}$/.test(qrData[0])) {
                    document.getElementById('cccd-number').textContent = qrData[0];
                    document.getElementById('customer-name').textContent = qrData[2] && !/^\d+$/.test(qrData[2]) ? qrData[2] : '';
                    document.getElementById('customer-address').textContent = qrData[5] && qrData[5].includes(' ') ? qrData[5] : '';
                    document.getElementById('customer-nationality').textContent = 'Việt Nam';
                    document.getElementById('customer-gender').textContent = 'Nam';
                    showToast('Quét CCCD từ ảnh thành công!', 'success');
                    speak('Quét CCCD từ ảnh thành công!');
                    scanContainer.remove();
                } else {
                    showToast('Dữ liệu CCCD trong ảnh không hợp lệ!', 'error');
                    speak('Dữ liệu CCCD trong ảnh không hợp lệ!');
                }
            } else {
                showToast('Không tìm thấy mã QR trong ảnh! Vui lòng nhập thủ công.', 'error');
                speak('Không tìm thấy mã QR trong ảnh! Vui lòng nhập thủ công.');
            }
            URL.revokeObjectURL(img.src);
        };
        img.onerror = function () {
            showToast('Lỗi khi tải ảnh CCCD!', 'error');
            speak('Lỗi khi tải ảnh CCCD!');
        };
        img.src = URL.createObjectURL(file);
    };
}

// Toggle between scan and manual input modes
function toggleManualInput() {
    document.getElementById('qr-box').style.display = 'none';
    document.getElementById('manual-input').style.display = 'block';
    document.getElementById('scan-btn').style.backgroundColor = '#007bff';
    document.getElementById('manual-input-btn').style.backgroundColor = '#28a745';
    resetCustomerInfo();
}

function toggleScanMode() {
    document.getElementById('qr-box').style.display = 'block';
    document.getElementById('manual-input').style.display = 'none';
    document.getElementById('scan-btn').style.backgroundColor = '#28a745';
    document.getElementById('manual-input-btn').style.backgroundColor = '#007bff';
    resetCustomerInfo();
}

// Add customer
document.getElementById('add-btn').addEventListener('click', () => {
    let cccdNumber, customerName, customerAddress, customerNationality, customerGender;

    if (document.getElementById('manual-input').style.display === 'block') {
        cccdNumber = document.getElementById('manual-cccd-number').value.trim();
        customerName = document.getElementById('manual-customer-name').value.trim();
        customerAddress = document.getElementById('manual-customer-address').value.trim();
        customerNationality = document.getElementById('manual-customer-nationality').value.trim();
        customerGender = document.getElementById('manual-customer-gender').value;

        if (!/^\d{12}$/.test(cccdNumber)) {
            showToast('Số CCCD phải có đúng 12 chữ số!', 'error');
            speak('Số CCCD phải có đúng 12 chữ số!');
            return;
        }
        if (!customerName || /^\d+$/.test(customerName)) {
            showToast('Họ tên không hợp lệ!', 'error');
            speak('Họ tên không hợp lệ!');
            return;
        }
        if (!customerAddress || customerAddress.length < 5) {
            showToast('Địa chỉ phải có ít nhất 5 ký tự!', 'error');
            speak('Địa chỉ phải có ít nhất 5 ký tự!');
            return;
        }
        if (!customerNationality) {
            showToast('Vui lòng nhập quốc tịch!', 'error');
            speak('Vui lòng nhập quốc tịch!');
            return;
        }

        document.getElementById('cccd-number').textContent = cccdNumber;
        document.getElementById('customer-name').textContent = customerName;
        document.getElementById('customer-address').textContent = customerAddress;
        document.getElementById('customer-nationality').textContent = customerNationality;
        document.getElementById('customer-gender').textContent = customerGender;
    } else {
        cccdNumber = document.getElementById('cccd-number').textContent;
        customerName = document.getElementById('customer-name').textContent;
        customerAddress = document.getElementById('customer-address').textContent;
        customerNationality = document.getElementById('customer-nationality').textContent;
        customerGender = document.getElementById('customer-gender').textContent;
    }

    if (cccdNumber === 'Chưa quét' || !customerName || !customerAddress || !customerNationality || customerGender === 'Chưa quét') {
        showToast('Vui lòng quét CCCD hoặc nhập đầy đủ thông tin khách!', 'error');
        speak('Vui lòng quét CCCD hoặc nhập đầy đủ thông tin khách!');
        return;
    }

    const customerTable = document.getElementById('customer-table').querySelector('tbody');
    const existingCustomer = Array.from(customerTable.rows).find(row => row.cells[3].textContent === cccdNumber);
    if (existingCustomer) {
        showToast('Khách này đã được thêm vào danh sách!', 'warning');
        speak('Khách này đã được thêm vào danh sách!');
        return;
    }

    const newRow = customerTable.insertRow();
    newRow.innerHTML = `
                <td><input type="checkbox" value="${customerTable.rows.length}"> ${customerTable.rows.length}</td>
                <td>${customerName}</td>
                <td>${customerGender}</td>
                <td>${cccdNumber}</td>
            `;
    showToast('Thêm khách thành công!', 'success');
    speak(`Thêm khách ${customerName} thành công!`);
    resetCustomerInfo();

    if (document.getElementById('manual-input').style.display === 'block') {
        document.getElementById('manual-cccd-number').value = '';
        document.getElementById('manual-customer-name').value = '';
        document.getElementById('manual-customer-address').value = '';
        document.getElementById('manual-customer-nationality').value = 'Việt Nam';
        document.getElementById('manual-customer-gender').value = 'Nam';
    }

    // Hiển thị thông báo nhắc nhở phân phòng
    document.getElementById('assign-room-alert').style.display = 'block';
});

// Skip button
document.getElementById('skip-btn').addEventListener('click', () => {
    resetCustomerInfo();
    showToast('Đã bỏ qua thông tin khách.', 'info');
    speak('Đã bỏ qua thông tin khách.');
});

// Move customers to room
document.getElementById('move-right').addEventListener('click', () => {
    const roomSelect = document.getElementById('room-select');
    const maPhong = roomSelect.value;
    if (!maPhong) {
        showToast('Vui lòng chọn phòng trước khi chuyển khách!', 'error');
        speak('Vui lòng chọn phòng trước khi chuyển khách!');
        return;
    }

    const customerTable = document.getElementById('customer-table').querySelector('tbody');
    const roomTable = document.getElementById('room-table').querySelector('tbody');
    const selectedRows = customerTable.querySelectorAll('input[type="checkbox"]:checked');

    if (selectedRows.length === 0) {
        showToast('Vui lòng chọn ít nhất một khách để chuyển!', 'error');
        speak('Vui lòng chọn ít nhất một khách để chuyển!');
        return;
    }

    selectedRows.forEach((checkbox) => {
        const row = checkbox.closest('tr');
        const rowData = row.cells;
        const cccdNumber = rowData[3].textContent;

        if (!currentRoomCustomers[maPhong]) {
            currentRoomCustomers[maPhong] = [];
        }
        if (currentRoomCustomers[maPhong].find(c => c.cccd === cccdNumber)) {
            showToast(`Khách ${rowData[1].textContent} đã có trong phòng này!`, 'warning');
            speak(`Khách ${rowData[1].textContent} đã có trong phòng này!`);
            return;
        }

        currentRoomCustomers[maPhong].push({
            name: rowData[1].textContent,
            gender: rowData[2].textContent,
            cccd: cccdNumber
        });

        const newRow = roomTable.insertRow();
        newRow.innerHTML = `
                    <td><input type="checkbox" value="${roomTable.rows.length}"> ${roomTable.rows.length}</td>
                    <td>${rowData[1].textContent}</td>
                    <td>${rowData[2].textContent}</td>
                    <td>${rowData[3].textContent}</td>
                `;
        row.remove();
    });

    updateCustomerTableSTT();
    updateRoomTableSTT();
    // Ẩn thông báo nếu không còn khách trong customer-table
    if (customerTable.rows.length === 0) {
        document.getElementById('assign-room-alert').style.display = 'none';
    }
});

// Move customers back to customer list
document.getElementById('move-left').addEventListener('click', () => {
    const roomSelect = document.getElementById('room-select');
    const maPhong = roomSelect.value;
    if (!maPhong) {
        showToast('Vui lòng chọn phòng trước khi chuyển khách!', 'error');
        speak('Vui lòng chọn phòng trước khi chuyển khách!');
        return;
    }

    const roomTable = document.getElementById('room-table').querySelector('tbody');
    const customerTable = document.getElementById('customer-table').querySelector('tbody');
    const selectedRows = roomTable.querySelectorAll('input[type="checkbox"]:checked');

    if (selectedRows.length === 0) {
        showToast('Vui lòng chọn ít nhất một khách để chuyển!', 'error');
        speak('Vui lòng chọn ít nhất một khách để chuyển!');
        return;
    }

    selectedRows.forEach((checkbox) => {
        const row = checkbox.closest('tr');
        const rowData = row.cells;
        const cccdNumber = rowData[3].textContent;

        if (currentRoomCustomers[maPhong]) {
            currentRoomCustomers[maPhong] = currentRoomCustomers[maPhong].filter(c => c.cccd !== cccdNumber);
        }

        const newRow = customerTable.insertRow();
        newRow.innerHTML = `
                    <td><input type="checkbox" value="${customerTable.rows.length}"> ${customerTable.rows.length}</td>
                    <td>${rowData[1].textContent}</td>
                    <td>${rowData[2].textContent}</td>
                    <td>${rowData[3].textContent}</td>
                `;
        row.remove();
    });

    updateCustomerTableSTT();
    updateRoomTableSTT();
    // Hiển thị lại thông báo nếu có khách trong customer-table
    if (customerTable.rows.length > 0) {
        document.getElementById('assign-room-alert').style.display = 'block';
    }
});

// Save all data (customers)
document.getElementById('save-btn').addEventListener('click', () => {
    if (!maNhomDatPhong) {
        showToast('Không tìm thấy thông tin đoàn!', 'error');
        speak('Không tìm thấy thông tin đoàn!');
        return;
    }

    Swal.fire({
        title: 'Xác nhận lưu thông tin khách',
        text: 'Bạn có chắc muốn lưu thông tin khách không?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Có, lưu',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            saveGroupData();
        }
    });
});

function saveGroupData() {
    const token = checkToken();
    if (!token) return;

    const customerTable = document.getElementById('customer-table').querySelector('tbody');
    const customers = Array.from(customerTable.rows).map(row => ({
        soGiayTo: row.cells[3].textContent,
        hoTen: row.cells[1].textContent,
        gioiTinh: row.cells[2].textContent,
        diaChi: 'N/A',
        quocTich: 'Việt Nam'
    }));

    const roomAssignments = Object.entries(currentRoomCustomers).map(([maPhong, customers]) => ({
        maPhong: parseInt(maPhong),
        customers: customers.map(c => ({
            soGiayTo: c.cccd,
            hoTen: c.name,
            gioiTinh: c.gender,
            diaChi: 'N/A',
            quocTich: 'Việt Nam'
        }))
    }));

    const customersWithoutRoom = customers.filter(customer =>
        !roomAssignments.some(r => r.customers.some(c => c.soGiayTo === customer.soGiayTo))
    );

    if (customersWithoutRoom.length > 0) {
        const customerNames = customersWithoutRoom.map(c => c.hoTen).join(', ');
        showToast(`Vui lòng phân phòng cho các khách sau trước khi lưu: ${customerNames}`, 'error');
        speak(`Vui lòng phân phòng cho các khách sau trước khi lưu: ${customerNames}`);
        return;
    }

    const checkinDate = document.getElementById('checkin-date').value;
    if (!checkinDate) {
        showToast('Vui lòng nhập ngày nhận phòng trước khi lưu khách!', 'error');
        speak('Vui lòng nhập ngày nhận phòng trước khi lưu khách!');
        return;
    }

    if (Object.keys(currentRoomCustomers).length === 0) {
        showToast('Không có khách nào được phân phòng!', 'error');
        speak('Không có khách nào được phân phòng!');
        return;
    }

    Swal.fire({
        title: 'Đang lưu...',
        text: 'Vui lòng đợi trong giây lát.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const customerPromises = customers.concat(...roomAssignments.flatMap(r => r.customers))
        .filter((c, i, arr) => arr.findIndex(x => x.soGiayTo === c.soGiayTo) === i)
        .map(customer => {
            const matchingRoom = roomAssignments.find(r => r.customers.some(c => c.soGiayTo === customer.soGiayTo));
            const maPhong = matchingRoom ? matchingRoom.maPhong : 0;

            if (maPhong === 0) {
                return Promise.reject(new Error(`Không tìm thấy phòng cho khách ${customer.hoTen}`));
            }

            return fetch('http://localhost:5000/api/KhachSanAPI/BookRoom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    MaPhong: maPhong,
                    LoaiGiayTo: 'CCCD',
                    SoGiayTo: customer.soGiayTo,
                    HoTen: customer.hoTen,
                    DiaChi: customer.diaChi,
                    QuocTich: customer.quocTich,
                    GioiTinh: customer.gioiTinh,
                    LoaiDatPhong: 'Theo ngày',
                    NgayNhanPhongDuKien: checkinDate
                })
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            throw new Error(`Lưu khách ${customer.hoTen} thất bại: ${err.message || `HTTP error! Status: ${response.status}`}`);
                        });
                    }
                    return response.json();
                })
                .then(data => ({ success: data.success, maDatPhong: data.maDatPhong, customer, maPhong }));
        });

    Promise.allSettled(customerPromises)
        .then(results => {
            const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
            if (failed.length > 0) {
                Swal.close();
                const errorMessages = failed.map(r => r.status === 'rejected' ? r.reason.message : `Lưu khách ${r.value.customer.hoTen} thất bại`);
                showToast('Lỗi khi lưu một số khách: ' + errorMessages.join('; '), 'error');
                speak('Lỗi khi lưu một số khách!');
                return;
            }

            const updatePromises = results
                .filter(r => r.status === 'fulfilled' && r.value.success)
                .map(result => {
                    return fetch('http://localhost:5000/api/KhachSanAPI/UpdateDatPhongGroup', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            MaDatPhong: result.value.maDatPhong,
                            MaNhomDatPhong: maNhomDatPhong
                        })
                    })
                        .then(response => {
                            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                            return response.json();
                        })
                        .then(data => {
                            if (!data.success) throw new Error(data.message || 'Lỗi khi cập nhật nhóm cho đặt phòng');
                            return result;
                        });
                });

            return Promise.allSettled(updatePromises);
        })
        .then(results => {
            const failed = results.filter(r => r.status === 'rejected');
            if (failed.length > 0) {
                Swal.close();
                const errorMessages = failed.map(r => r.reason.message);
                showToast('Lỗi khi cập nhật nhóm cho một số đặt phòng: ' + errorMessages.join('; '), 'error');
                speak('Lỗi khi cập nhật nhóm cho một số đặt phòng!');
                return;
            }

            Swal.close();
            showToast('Lưu thông tin khách thành công!', 'success');
            speak('Lưu thông tin khách thành công!');

            // Làm mới dữ liệu và giao diện
            currentRoomCustomers = {};
            document.getElementById('customer-table').querySelector('tbody').innerHTML = '';
            document.getElementById('room-table').querySelector('tbody').innerHTML = '';
            resetCustomerInfo();
            loadAvailableRooms();
            loadAssignedRooms();
            document.getElementById('assign-room-alert').style.display = 'none';

            // Xóa dòng chuyển hướng
            // window.location.href = '/khachsan.html';
        })
        .catch(error => {
            Swal.close();
            console.error('Lỗi khi lưu dữ liệu:', error);
            showToast('Lỗi khi lưu dữ liệu: ' + error.message, 'error');
            speak('Lỗi khi lưu dữ liệu: ' + error.message);
        });
}

// Reset customer info
function resetCustomerInfo() {
    document.getElementById('cccd-number').textContent = 'Chưa quét';
    document.getElementById('customer-name').textContent = 'Chưa quét';
    document.getElementById('customer-address').textContent = 'Chưa quét';
    document.getElementById('customer-nationality').textContent = 'Chưa quét';
    document.getElementById('customer-gender').textContent = 'Chưa quét';
}

// Update STT for customer table
function updateCustomerTableSTT() {
    const customerTable = document.getElementById('customer-table').querySelector('tbody');
    Array.from(customerTable.rows).forEach((row, index) => {
        row.cells[0].innerHTML = `<input type="checkbox" value="${index + 1}"> ${index + 1}`;
    });
}

// Update STT for room table
function updateRoomTableSTT() {
    const roomTable = document.getElementById('room-table').querySelector('tbody');
    Array.from(roomTable.rows).forEach((row, index) => {
        row.cells[0].innerHTML = `<input type="checkbox" value="${index + 1}"> ${index + 1}`;
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadGroupInfo();
    document.getElementById('scan-btn').addEventListener('click', scanCCCD);
    document.getElementById('manual-input-btn').addEventListener('click', toggleManualInput);
    toggleScanMode();
});

// Back button
document.getElementById('back-btn').addEventListener('click', () => {
    Swal.fire({
        title: 'Xác nhận trở về',
        text: 'Bạn có chắc muốn trở về trang chủ không? Dữ liệu chưa lưu sẽ bị mất.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Có, trở về',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '/khachsan.html';
        }
    });
});