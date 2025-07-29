// Hàm gọi API với jQuery AJAX
function callApi(url, method = 'GET', data = null) {
    const token = localStorage.getItem('jwtToken');
    const baseUrl = 'https://localhost:5001';

    return $.ajax({
        url: baseUrl + url,
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: data ? JSON.stringify(data) : null,
        dataType: 'json',
        timeout: 10000,
        beforeSend: function () {
            console.log(`Gửi yêu cầu API: ${baseUrl + url}`);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error(`Lỗi API ${baseUrl + url}: ${textStatus} - ${errorThrown}`);
            if (jqXHR.status === 401) {
                alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                window.location.href = 'login.html';
            }
        }
    });
}

// Hàm định dạng ngày thành chuỗi DD/MM/YYYY
function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

// Hàm định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Hàm hiển thị trạng thái loading
function showLoadingState() {
    const loadingHtml = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
    const container = document.querySelector('.table-responsive');
    if (container) {
        container.innerHTML = loadingHtml;
    }
}

// Hàm ẩn trạng thái loading
function hideLoadingState() {
    // Không cần làm gì vì bảng sẽ được vẽ lại
}

// Hàm hiển thị thông báo
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    const container = document.querySelector('.container-fluid');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Hàm tải danh sách hóa đơn
function loadInvoices() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();

    // Đặt phạm vi ngày mặc định là năm 2024
    const defaultStartDate = new Date('2024-01-01');
    const defaultEndDate = new Date('2024-12-31');

    const params = {
        startDate: startDate || defaultStartDate.toISOString().split('T')[0],
        endDate: endDate || defaultEndDate.toISOString().split('T')[0]
    };

    console.log('Params:', params);

    if (!startDate) $('#startDate').val(params.startDate);
    if (!endDate) $('#endDate').val(params.endDate);

    showLoadingState();

    callApi(`AdminAPI/Invoices?startDate=${params.startDate}&endDate=${params.endDate}`)
        .done(function (response) {
            if (response && response.success) {
                if (response.invoices && response.invoices.length > 0) {
                    const table = $('#invoicesTable').DataTable({
                        destroy: true, // Hủy bảng cũ nếu có
                        data: response.invoices,
                        columns: [
                            { data: 'MaHoaDon' },
                            { data: 'MaDatPhong' },
                            { data: 'SoPhong' },
                            { 
                                data: 'NgayXuat',
                                render: function (data) {
                                    return formatDate(data);
                                }
                            },
                            { 
                                data: 'TongTien',
                                render: function (data) {
                                    return formatCurrency(data);
                                }
                            },
                            { data: 'PhuongThucThanhToan' },
                            { data: 'TrangThaiThanhToan' },
                            { data: 'LoaiHoaDon' },
                            { data: 'GhiChu' },
                            {
                                data: null,
                                render: function (data, type, row) {
                                    return `
                                        <select class="form-control d-inline w-auto status-select" data-mahoadon="${row.MaHoaDon}">
                                            <option value="Đã thanh toán" ${row.TrangThaiThanhToan === 'Đã thanh toán' ? 'selected' : ''}>Đã thanh toán</option>
                                            <option value="Chưa thanh toán" ${row.TrangThaiThanhToan === 'Chưa thanh toán' ? 'selected' : ''}>Chưa thanh toán</option>
                                        </select>
                                        <button class="btn btn-primary btn-sm ml-2 update-status-btn" data-mahoadon="${row.MaHoaDon}">Cập nhật</button>
                                    `;
                                }
                            }
                        ],
                        language: {
                            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/vi.json' // Ngôn ngữ tiếng Việt cho DataTables
                        }
                    });

                    // Xử lý sự kiện cập nhật trạng thái
                    $('#invoicesTable tbody').on('click', '.update-status-btn', function () {
                        const maHoaDon = $(this).data('mahoadon');
                        const select = $(this).siblings('.status-select');
                        const newStatus = select.val();
                        updateInvoiceStatus(maHoaDon, newStatus);
                    });
                } else {
                    $('#invoicesTable').DataTable({
                        destroy: true,
                        data: [],
                        columns: [
                            { data: 'MaHoaDon' },
                            { data: 'MaDatPhong' },
                            { data: 'SoPhong' },
                            { data: 'NgayXuat' },
                            { data: 'TongTien' },
                            { data: 'PhuongThucThanhToan' },
                            { data: 'TrangThaiThanhToan' },
                            { data: 'LoaiHoaDon' },
                            { data: 'GhiChu' },
                            { data: null }
                        ],
                        language: {
                            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/vi.json'
                        }
                    });
                    showAlert('Không có hóa đơn nào trong khoảng thời gian này.', 'info');
                }
            } else {
                showAlert('Không thể tải dữ liệu hóa đơn.', 'error');
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            const errorMessage = jqXHR.responseJSON?.message || errorThrown || textStatus;
            console.error('Lỗi khi gọi API danh sách hóa đơn:', errorMessage, jqXHR.responseJSON);
            showAlert(`Lỗi tải dữ liệu: ${errorMessage}`, 'error');
        })
        .always(function() {
            hideLoadingState();
        });
}

// Hàm cập nhật trạng thái hóa đơn
function updateInvoiceStatus(maHoaDon, trangThaiThanhToan) {
    callApi(`AdminAPI/Invoices/UpdateStatus/${maHoaDon}`, 'PUT', { TrangThaiThanhToan: trangThaiThanhToan })
        .done(function (response) {
            if (response && response.success) {
                showAlert('Cập nhật trạng thái hóa đơn thành công.', 'success');
                loadInvoices(); // Tải lại danh sách hóa đơn
            } else {
                showAlert('Không thể cập nhật trạng thái hóa đơn.', 'error');
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            const errorMessage = jqXHR.responseJSON?.message || errorThrown || textStatus;
            console.error('Lỗi khi cập nhật trạng thái hóa đơn:', errorMessage, jqXHR.responseJSON);
            showAlert(`Lỗi cập nhật trạng thái: ${errorMessage}`, 'error');
        });
}

// Xử lý form lọc ngày
$(document).ready(function() {
    console.log('Invoices page loaded');
    
    $('#dateFilterForm').submit(function (e) {
        e.preventDefault();
        console.log('Date filter form submitted');
        loadInvoices();
    });
});