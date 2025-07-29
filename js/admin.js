const API_BASE_URL = 'https://localhost:5001'; // Thay bằng URL API thực tế

// Kiểm tra đăng nhập và vai trò admin khi load trang
$(document).ready(function () {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const vaitro = localStorage.getItem('vaitro');
    if (vaitro !== 'Quản trị') {
        alert('Bạn không có quyền truy cập trang admin.');
        logout();
        return;
    }

    // Hiển thị tên người dùng từ localStorage
    const hoTen = localStorage.getItem('hoTen') || localStorage.getItem('tenDangNhap');
    $('#username').text(hoTen || 'Admin');
});

// Hàm gọi API với token
function callApi(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('jwtToken');
    const options = {
        url: `${API_BASE_URL}/api/${endpoint}`,
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    if (data) {
        options.data = JSON.stringify(data);
    }
    return $.ajax(options);
}

// Hàm đăng xuất
function logout() {
    callApi('Auth/logout', 'POST')
        .always(function () {
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('tenDangNhap');
            localStorage.removeItem('vaitro');
            localStorage.removeItem('hoTen');
            window.location.href = 'login.html';
        });
}

// Hàm tìm kiếm (tùy chỉnh theo yêu cầu)
function search() {
    const query = $('#searchQuery').val();
    alert('Tìm kiếm: ' + query); // Thay bằng logic tìm kiếm thực tế
}

// Hàm load danh sách loại phòng
function loadRoomTypes() {
    callApi('AdminAPI/RoomTypes')
        .done(function (response) {
            if (response.success) {
                let options = '<option value="">Chọn loại phòng</option>';
                response.roomTypes.forEach(type => {
                    options += `<option value="${type.maLoaiPhong}">${type.tenLoaiPhong}</option>`;
                });
                $('#maLoaiPhong').html(options);
                $('#editMaLoaiPhong').html(options);
            } else {
                console.error('Lỗi load loại phòng:', response.message);
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.error('API error:', textStatus, errorThrown);
        });
}

// Hàm load danh sách phòng
function loadRooms() {
    callApi('AdminAPI/Rooms')
        .done(function (response) {
            if (response.success) {
                let html = '';
                response.rooms.forEach(room => {
                    html += `
                        <tr>
                            <td>${room.maPhong}</td>
                            <td>${room.soPhong}</td>
                            <td>${room.loaiPhong}</td>
                            <td>${room.giaTheoGio.toLocaleString('vi-VN')} VNĐ</td>
                            <td>${room.giaTheoNgay.toLocaleString('vi-VN')} VNĐ</td>
                            <td>${room.trangThai}</td>
                            <td>
                                <button class="btn btn-warning btn-sm edit-room" data-id="${room.maPhong}" data-so-phong="${room.soPhong}" data-ma-loai-phong="${room.maLoaiPhong}">Sửa</button>
                                <button class="btn btn-danger btn-sm delete-room" data-id="${room.maPhong}">Xóa</button>
                            </td>
                        </tr>`;
                });
                $('#roomTable tbody').html(html);
                $('#roomTable').DataTable();

                // Gắn sự kiện click cho nút Sửa
                $('.edit-room').click(function () {
                    const maPhong = $(this).data('id');
                    const soPhong = $(this).data('so-phong');
                    const maLoaiPhong = $(this).data('ma-loai-phong');
                    $('#editMaPhong').val(maPhong);
                    $('#editSoPhong').val(soPhong);
                    $('#editMaLoaiPhong').val(maLoaiPhong);
                    $('#editRoomModal').modal('show');
                });

                // Gắn sự kiện click cho nút Xóa
                $('.delete-room').click(function () {
                    const maPhong = $(this).data('id');
                    if (confirm('Bạn có chắc muốn xóa phòng này?')) {
                        callApi(`AdminAPI/Rooms/${maPhong}`, 'DELETE')
                            .done(function (response) {
                                if (response.success) {
                                    alert('Xóa phòng thành công!');
                                    loadRooms();
                                } else {
                                    alert('Lỗi: ' + response.message);
                                }
                            })
                            .fail(function (jqXHR, textStatus, errorThrown) {
                                alert('Lỗi khi xóa phòng: ' + errorThrown);
                            });
                    }
                });
            } else {
                $('#content-area').html('<div class="alert alert-danger">' + response.message + '</div>');
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.error('API error:', textStatus, errorThrown);
            $('#content-area').html('<div class="alert alert-danger">Lỗi khi gọi API: ' + errorThrown + '</div>');
        });
}

// Xử lý thêm phòng mới
$('#addRoomForm').submit(function (e) {
    e.preventDefault();
    const soPhong = $('#soPhong').val().trim();
    const maLoaiPhong = parseInt($('#maLoaiPhong').val());
    const moTa = $('#moTa').val().trim(); // Lấy giá trị MoTa từ form
    const messageElement = $('#addRoomMessage');

    if (!soPhong || isNaN(maLoaiPhong) || maLoaiPhong <= 0) {
        messageElement.text('Vui lòng nhập đầy đủ và đúng thông tin (Số phòng và Loại phòng là bắt buộc).');
        messageElement.css('color', 'red');
        return;
    }

    // Gửi MoTa trong yêu cầu API, nếu không nhập thì để MoTa là chuỗi rỗng
    callApi('AdminAPI/Rooms', 'POST', { soPhong, maLoaiPhong, moTa })
        .done(function (response) {
            if (response.success) {
                messageElement.text('Thêm phòng thành công!');
                messageElement.css('color', 'green');
                $('#addRoomForm').trigger('reset');
                $('#addRoomModal').modal('hide');
                loadRooms();
            } else {
                messageElement.text(response.message);
                messageElement.css('color', 'red');
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            messageElement.text('Lỗi khi thêm phòng: ' + errorThrown);
            messageElement.css('color', 'red');
        });
});

// Xử lý sửa phòng
$('#editRoomForm').submit(function (e) {
    e.preventDefault();
    const maPhong = parseInt($('#editMaPhong').val());
    const soPhong = $('#editSoPhong').val().trim();
    const maLoaiPhong = parseInt($('#editMaLoaiPhong').val());
    const messageElement = $('#editRoomMessage');

    if (!soPhong || isNaN(maLoaiPhong) || maLoaiPhong <= 0 || isNaN(maPhong)) {
        messageElement.text('Vui lòng nhập đầy đủ và đúng thông tin.');
        messageElement.css('color', 'red');
        return;
    }

    callApi(`AdminAPI/Rooms/${maPhong}`, 'PUT', { soPhong, maLoaiPhong })
        .done(function (response) {
            if (response.success) {
                messageElement.text('Cập nhật phòng thành công!');
                messageElement.css('color', 'green');
                $('#editRoomForm').trigger('reset');
                $('#editRoomModal').modal('hide');
                loadRooms();
            } else {
                messageElement.text(response.message);
                messageElement.css('color', 'red');
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            messageElement.text('Lỗi khi cập nhật phòng: ' + errorThrown);
            messageElement.css('color', 'red');
        });
});

// Hàm load danh sách người dùng
function loadUsers() {
    callApi('AdminAPI/Users')
        .done(function (response) {
            if (response.success) {
                let html = '';
                response.users.forEach(user => {
                    html += `
                        <tr>
                            <td>${user.maNguoiDung}</td>
                            <td>${user.hoTen}</td>
                            <td>${user.email}</td>
                            <td>${user.soDienThoai || 'N/A'}</td>
                            <td>${user.vaiTro}</td>
                            <td>
                                <button class="btn btn-warning btn-sm edit-user" 
                                        data-id="${user.maNguoiDung}" 
                                        data-ho-ten="${user.hoTen}" 
                                        data-email="${user.email}" 
                                        data-so-dien-thoai="${user.soDienThoai || ''}" 
                                        data-vai-tro="${user.vaiTro}">Sửa</button>
                                <button class="btn btn-danger btn-sm delete-user" data-id="${user.maNguoiDung}">Xóa</button>
                            </td>
                        </tr>`;
                });
                $('#userTable tbody').html(html);
                $('#userTable').DataTable();

                // Gắn sự kiện cho nút Sửa
                $('.edit-user').click(function () {
                    const maNguoiDung = $(this).data('id');
                    const hoTen = $(this).data('ho-ten');
                    const email = $(this).data('email');
                    const soDienThoai = $(this).data('so-dien-thoai');
                    const vaiTro = $(this).data('vai-tro');
                    $('#editMaNguoiDung').val(maNguoiDung);
                    $('#editHoTen').val(hoTen);
                    $('#editEmail').val(email);
                    $('#editSoDienThoai').val(soDienThoai);
                    $('#editVaiTro').val(vaiTro);
                    $('#editUserModal').modal('show');
                });

                // Gắn sự kiện cho nút Xóa
                $('.delete-user').click(function () {
                    const maNguoiDung = $(this).data('id');
                    if (confirm('Bạn có chắc muốn xóa người dùng này?')) {
                        callApi(`AdminAPI/Users/${maNguoiDung}`, 'DELETE')
                            .done(function (response) {
                                if (response.success) {
                                    alert('Xóa người dùng thành công!');
                                    loadUsers();
                                } else {
                                    alert('Lỗi: ' + response.message);
                                }
                            })
                            .fail(function () {
                                alert('Lỗi khi xóa người dùng.');
                            });
                    }
                });
            } else {
                $('#content-area').html('<div class="alert alert-danger">' + response.message + '</div>');
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.error('API error:', textStatus, errorThrown);
            $('#content-area').html('<div class="alert alert-danger">Lỗi khi gọi API: ' + errorThrown + '</div>');
        });
}

// Xử lý thêm người dùng mới
$('#addUserForm').submit(function (e) {
    e.preventDefault();
    const hoTen = $('#hoTen').val().trim();
    const email = $('#email').val().trim();
    const matKhau = $('#matKhau').val();
    const soDienThoai = $('#soDienThoai').val().trim();
    const vaiTro = $('#vaiTro').val();
    const messageElement = $('#addUserMessage');

    if (!hoTen || !email || !matKhau || !vaiTro) {
        messageElement.text('Vui lòng nhập đầy đủ thông tin bắt buộc (Họ tên, Email, Mật khẩu, Vai trò).');
        messageElement.css('color', 'red');
        return;
    }

    callApi('AdminAPI/Users', 'POST', { hoTen, email, matKhau, soDienThoai, vaiTro })
        .done(function (response) {
            if (response.success) {
                messageElement.text('Thêm người dùng thành công!');
                messageElement.css('color', 'green');
                $('#addUserForm').trigger('reset');
                $('#addUserModal').modal('hide');
                loadUsers();
            } else {
                messageElement.text(response.message);
                messageElement.css('color', 'red');
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            messageElement.text('Lỗi khi thêm người dùng: ' + errorThrown);
            messageElement.css('color', 'red');
        });
});

// Xử lý sửa người dùng
$('#editUserForm').submit(function (e) {
    e.preventDefault();
    const maNguoiDung = parseInt($('#editMaNguoiDung').val());
    const hoTen = $('#editHoTen').val().trim();
    const email = $('#editEmail').val().trim();
    const matKhau = $('#editMatKhau').val();
    const soDienThoai = $('#editSoDienThoai').val().trim();
    const vaiTro = $('#editVaiTro').val();
    const messageElement = $('#editUserMessage');

    if (!hoTen || !email || !vaiTro) {
        messageElement.text('Vui lòng nhập đầy đủ thông tin bắt buộc (Họ tên, Email, Vai trò).');
        messageElement.css('color', 'red');
        return;
    }

    const payload = { hoTen, email, soDienThoai, vaiTro };
    if (matKhau) {
        payload.matKhau = matKhau; // Chỉ gửi mật khẩu nếu người dùng nhập
    }

    callApi(`AdminAPI/Users/${maNguoiDung}`, 'PUT', payload)
        .done(function (response) {
            if (response.success) {
                messageElement.text('Cập nhật người dùng thành công!');
                messageElement.css('color', 'green');
                $('#editUserForm').trigger('reset');
                $('#editUserModal').modal('hide');
                loadUsers();
            } else {
                messageElement.text(response.message);
                messageElement.css('color', 'red');
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            messageElement.text('Lỗi khi cập nhật người dùng: ' + errorThrown);
            messageElement.css('color', 'red');
        });
});
