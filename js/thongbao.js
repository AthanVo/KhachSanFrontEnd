let notificationsData = [];

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
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} icon"></i>
        <span class="message">${message}</span>
        <button class="close" onclick="this.parentElement.remove()">×</button>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}

document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để tải thông báo!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    loadNotifications();
    checkStuckShifts();
    setInterval(checkStuckShifts, 120 * 60 * 1000);
});

function loadNotifications() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để xem thông báo!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    let maNhanVien = localStorage.getItem('maNhanVien');
    if (!maNhanVien) {
        fetch('https://localhost:5001/api/KhachSanAPI/current-user', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Unauthorized');
                    }
                    console.error(`Yêu cầu API thất bại: Status ${response.status}, StatusText: ${response.statusText}`);
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    maNhanVien = data.user.maNguoiDung;
                    localStorage.setItem('maNhanVien', maNhanVien);
                    continueLoadingNotifications(maNhanVien);
                } else {
                    console.error('Không thể lấy MaNhanVien:', data.message);
                    const dropdown = document.getElementById('notification-dropdown');
                    if (dropdown) {
                        dropdown.innerHTML = '<p>Lỗi khi tải thông báo!</p>';
                    }
                    showToast(data.message || 'Không thể lấy thông tin người dùng!', 'error');
                }
            })
            .catch(error => {
                console.error('Lỗi khi lấy MaNhanVien:', error);
                if (error.message === 'Unauthorized') {
                    showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
                    localStorage.removeItem('jwtToken');
                    localStorage.removeItem('username');
                    localStorage.removeItem('vaitro');
                    localStorage.removeItem('maNhanVien');
                    window.location.href = 'login.html';
                } else {
                    const dropdown = document.getElementById('notification-dropdown');
                    if (dropdown) {
                        dropdown.innerHTML = '<p>Lỗi khi tải thông báo!</p>';
                    }
                    showToast('Lỗi khi tải thông tin người dùng: ' + error.message, 'error');
                }
            });
    } else {
        continueLoadingNotifications(maNhanVien);
    }
}

function continueLoadingNotifications(maNhanVien) {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để xem thông báo!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    console.log("Đang tải thông báo chưa đọc...");
    fetch(`https://localhost:5001/api/KhachSanAPI/notifications/unread`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }
                console.error(`Yêu cầu API thất bại: Status ${response.status}, StatusText: ${response.statusText}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Kết quả thông báo:", data);
            console.log("Raw data:", JSON.stringify(data));
            console.log("Notifications data:", data.notifications);
            if (data.notifications && data.notifications.length > 0) {
                console.log("First notification:", data.notifications[0]);
                console.log("Available fields:", Object.keys(data.notifications[0]));
                console.log("ID field name:", Object.keys(data.notifications[0]).find(key => key.toLowerCase().includes('thongbao')));
            }

            const dropdown = document.getElementById('notification-dropdown');
            const countElement = document.getElementById('notification-count');
            dropdown.innerHTML = '';

            if (data.success && data.notifications && data.notifications.length > 0) {
                notificationsData = data.notifications;
                countElement.textContent = data.unreadCount;

                data.notifications.forEach(notification => {
                    const notificationId = notification.MaThongBao || notification.maThongBao;
                    const title = notification.TieuDe || notification.tieuDe;
                    const content = notification.NoiDung || notification.noiDung;
                    let time = notification.ThoiGianGui || notification.thoiGianGui;

                    // Chuyển đổi định dạng thời gian từ "dd/MM/yyyy HH:mm:ss" sang "yyyy-MM-ddTHH:mm:ss"
                    if (time) {
                        const [datePart, timePart] = time.split(' ');
                        const [day, month, year] = datePart.split('/');
                        time = `${year}-${month}-${day}T${timePart}`; // Chuyển thành "2025-05-30T09:51:44"
                    }

                    const item = document.createElement('div');
                    item.className = 'notification-item';
                    item.setAttribute('data-id', notificationId);
                    item.innerHTML = `
        <strong>${title}</strong>
        <p>${content}</p>
        <small>${new Date(time).toLocaleString('vi-VN')}</small>
    `;
                    item.addEventListener('click', () => {
                        console.log("Click vào thông báo ID:", notificationId);
                        markAsRead(notificationId, item);
                    });

                    dropdown.appendChild(item);
                });
            } else {
                countElement.textContent = '0';
                dropdown.innerHTML = '<p>Không có thông báo mới</p>';
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải thông báo:', error);
            if (error.message === 'Unauthorized') {
                showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
                localStorage.removeItem('jwtToken');
                localStorage.removeItem('username');
                localStorage.removeItem('vaitro');
                localStorage.removeItem('maNhanVien');
                window.location.href = 'login.html';
            } else {
                const dropdown = document.getElementById('notification-dropdown');
                if (dropdown) {
                    dropdown.innerHTML = '<p>Lỗi khi tải thông báo!</p>';
                }
                showToast('Lỗi khi tải thông báo: ' + error.message, 'error');
            }
        });
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const debouncedLoadNotifications = debounce(loadNotifications, 1000);

function toggleNotifications() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để xem thông báo!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        debouncedLoadNotifications();
        dropdown.style.display = 'block';
    }
}

function markAsRead(maThongBao, element) {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để đánh dấu thông báo!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    console.log(`Đánh dấu đã đọc: ${maThongBao}`);
    if (!maThongBao) {
        console.error("ID thông báo không hợp lệ:", maThongBao);
        showToast("Lỗi: ID thông báo không hợp lệ", 'error');
        return;
    }

    fetch(`https://localhost:5001/api/KhachSanAPI/notifications/mark-read/${maThongBao}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            console.log("Nhận response:", response.status);
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }
                console.error(`Yêu cầu API thất bại: Status ${response.status}, StatusText: ${response.statusText}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Kết quả:", data);
            if (data.success) {
                console.log(`Đánh dấu thành công, trạng thái: ${data.status}`);
                showToast('Thông báo đã được đánh dấu là đã đọc!', 'success');

                if (element && element.parentNode) {
                    element.remove();
                }

                if (notificationsData.length > 0) {
                    notificationsData = notificationsData.filter(notification => {
                        const notificationId = notification.MaThongBao || notification.maThongBao;
                        return notificationId != maThongBao;
                    });
                }

                const countElement = document.getElementById('notification-count');
                countElement.textContent = data.unreadCount;

                const dropdown = document.getElementById('notification-dropdown');
                if (dropdown && (!dropdown.children.length || dropdown.children.length === 0)) {
                    dropdown.innerHTML = '<p>Không có thông báo mới</p>';
                }
            } else {
                console.error(`Lỗi: ${data.message}`);
                showToast(data.message || 'Có lỗi xảy ra khi đánh dấu thông báo!', 'error');
                loadNotifications();
            }
        })
        .catch(error => {
            console.error('Lỗi khi đánh dấu thông báo:', error);
            if (error.message === 'Unauthorized') {
                showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
                localStorage.removeItem('jwtToken');
                localStorage.removeItem('username');
                localStorage.removeItem('vaitro');
                localStorage.removeItem('maNhanVien');
                window.location.href = 'login.html';
            } else {
                showToast('Lỗi khi đánh dấu thông báo: ' + error.message, 'error');
                loadNotifications();
            }
        });
}

function checkStuckShifts() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Không tìm thấy token trong localStorage');
        showToast('Bạn cần đăng nhập để kiểm tra ca bị kẹt!', 'warning');
        window.location.href = 'login.html';
        return;
    }

    fetch('https://localhost:5001/api/KhachSanAPI/check-stuck-shifts', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }
                console.error(`Yêu cầu API thất bại: Status ${response.status}, StatusText: ${response.statusText}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log(data.message);
                loadNotifications();
            } else {
                console.error('Lỗi khi kiểm tra ca bị kẹt:', data.message);
                showToast(data.message || 'Lỗi khi kiểm tra ca bị kẹt!', 'error');
            }
        })
        .catch(error => {
            console.error('Lỗi khi kiểm tra ca bị kẹt:', error);
            if (error.message === 'Unauthorized') {
                showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
                localStorage.removeItem('jwtToken');
                localStorage.removeItem('username');
                localStorage.removeItem('vaitro');
                localStorage.removeItem('maNhanVien');
                window.location.href = 'login.html';
            } else {
                showToast('Lỗi khi kiểm tra ca bị kẹt: ' + error.message, 'error');
            }
        });
}