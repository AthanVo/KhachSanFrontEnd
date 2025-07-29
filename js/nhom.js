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
                return fetch('http://localhost:5001/api/KhachSanAPI/UpdateDatPhongGroup', {
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