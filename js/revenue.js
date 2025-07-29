// Hàm gọi API với jQuery AJAX
function callApi(url, method = 'GET', data = null) {
    const token = localStorage.getItem('jwtToken');
    const baseUrl = 'https://localhost:5001'; // Thay bằng URL backend của bạn

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

// Global variables để lưu trữ chart instances
let dailyChart = null;
let monthlyChart = null;
let yearlyChart = null;

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

// Hàm destroy chart cũ
function destroyChart(chart) {
    if (chart) {
        chart.destroy();
    }
    return null;
}

// Hàm tạo biểu đồ an toàn
function createSafeChart(canvasId, config) {
    try {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} không tìm thấy`);
            return null;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error(`Không thể lấy context 2D cho ${canvasId}`);
            return null;
        }

        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            existingChart.destroy();
        }

        return new Chart(ctx, config);
    } catch (error) {
        console.error(`Lỗi tạo biểu đồ ${canvasId}:`, error);
        return null;
    }
}

// Hàm tải và vẽ báo cáo doanh thu
function loadRevenueReports() {
    console.log('Bắt đầu tải báo cáo doanh thu...');
    
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();

    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const defaultEndDate = new Date();

    const params = {
        startDate: startDate || defaultStartDate.toISOString().split('T')[0],
        endDate: endDate || defaultEndDate.toISOString().split('T')[0]
    };

    console.log('Params:', params);

    if (!startDate) $('#startDate').val(params.startDate);
    if (!endDate) $('#endDate').val(params.endDate);

    showLoadingState();

    loadDailyRevenue(params);
    loadMonthlyRevenue(params);
    loadYearlyRevenue(params);
}

// Hàm hiển thị trạng thái loading
function showLoadingState() {
    const loadingHtml = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
    
    $('.chart-container').each(function() {
        const $container = $(this);
        if (!$container.find('.loading-overlay').length) {
            $container.css('position', 'relative');
            $container.append(`<div class="loading-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;">${loadingHtml}</div>`);
        }
    });
}

// Hàm cập nhật tổng doanh thu
function updateTotalRevenue(totalRevenue) {
    const totalRevenueElement = document.getElementById('totalRevenue');
    if (totalRevenueElement) {
        totalRevenueElement.textContent = formatCurrency(totalRevenue);
    }
}
// Hàm ẩn trạng thái loading
function hideLoadingState() {
    $('.loading-overlay').remove();
}

// Tải doanh thu theo ngày
function loadDailyRevenue(params) {
    callApi(`AdminAPI/Reports/Revenue?startDate=${params.startDate}&endDate=${params.endDate}&groupBy=day`)
        .done(function (response) {
            console.log('Daily revenue response:', response);
            if (response && response.success && Array.isArray(response.revenue) && response.revenue.length > 0) {
                const labels = response.revenue.map(item => formatDate(item.date));
                const data = response.revenue.map(item => item.totalRevenue || 0);

                const config = {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Doanh thu (VNĐ)',
                            data: data,
                            backgroundColor: 'rgba(54, 162, 235, 0.6)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return formatCurrency(value);
                                    }
                                }
                            },
                            x: {
                                ticks: {
                                    maxRotation: 45,
                                    minRotation: 0
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `Doanh thu: ${formatCurrency(context.parsed.y)}`;
                                    }
                                }
                            }
                        }
                    }
                };

                dailyChart = createSafeChart('dailyRevenueChart', config);
                console.log('Daily chart created successfully');
            } else {
                console.warn('Dữ liệu doanh thu theo ngày không hợp lệ hoặc rỗng:', response);
                showNoDataMessage('dailyRevenueChart', 'Không có dữ liệu doanh thu theo ngày');
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.error('Lỗi khi gọi API doanh thu theo ngày:', textStatus, errorThrown);
            showErrorMessage('dailyRevenueChart', `Lỗi tải dữ liệu: ${textStatus} - ${errorThrown}`);
        })
        .always(function() {
            hideLoadingState();
        });
}

// Tải doanh thu theo tháng
function loadMonthlyRevenue(params) {
    callApi(`AdminAPI/Reports/Revenue?startDate=${params.startDate}&endDate=${params.endDate}&groupBy=month`)
        .done(function (response) {
            console.log('Monthly revenue response:', response);
            if (response && response.success && Array.isArray(response.revenue) && response.revenue.length > 0) {
                const labels = response.revenue.map(item => `Tháng ${item.month}/${item.year}`);
                const data = response.revenue.map(item => item.totalRevenue || 0);

                const config = {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Doanh thu (VNĐ)',
                            data: data,
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return formatCurrency(value);
                                    }
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `Doanh thu: ${formatCurrency(context.parsed.y)}`;
                                    }
                                }
                            }
                        }
                    }
                };

                monthlyChart = createSafeChart('monthlyRevenueChart', config);
                console.log('Monthly chart created successfully');
            } else {
                console.warn('Dữ liệu doanh thu theo tháng không hợp lệ hoặc rỗng:', response);
                showNoDataMessage('monthlyRevenueChart', 'Không có dữ liệu doanh thu theo tháng');
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.error('Lỗi khi gọi API doanh thu theo tháng:', textStatus, errorThrown);
            showErrorMessage('monthlyRevenueChart', `Lỗi tải dữ liệu: ${textStatus} - ${errorThrown}`);
        })
        .always(function() {
            hideLoadingState();
        });
}

// Tải doanh thu theo năm
function loadYearlyRevenue(params) {
    callApi(`AdminAPI/Reports/Revenue?startDate=${params.startDate}&endDate=${params.endDate}&groupBy=year`)
        .done(function (response) {
            console.log('Yearly revenue response:', response);
            if (response && response.success && Array.isArray(response.revenue) && response.revenue.length > 0) {
                const labels = response.revenue.map(item => `Năm ${item.year}`);
                const data = response.revenue.map(item => item.totalRevenue || 0);

                const config = {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Doanh thu (VNĐ)',
                            data: data,
                            backgroundColor: 'rgba(255, 159, 64, 0.6)',
                            borderColor: 'rgba(255, 159, 64, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return formatCurrency(value);
                                    }
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `Doanh thu: ${formatCurrency(context.parsed.y)}`;
                                    }
                                }
                            }
                        }
                    }
                };

                yearlyChart = createSafeChart('yearlyRevenueChart', config);
                console.log('Yearly chart created successfully');
            } else {
                console.warn('Dữ liệu doanh thu theo năm không hợp lệ hoặc rỗng:', response);
                showNoDataMessage('yearlyRevenueChart', 'Không có dữ liệu doanh thu theo năm');
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.error('Lỗi khi gọi API doanh thu theo năm:', textStatus, errorThrown);
            showErrorMessage('yearlyRevenueChart', `Lỗi tải dữ liệu: ${textStatus} - ${errorThrown}`);
        })
        .always(function() {
            hideLoadingState();
        });
}

// Hiển thị thông báo không có dữ liệu
function showNoDataMessage(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        const container = canvas.parentElement;
        container.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="fas fa-info-circle"></i> ${message}
            </div>
            <canvas id="${canvasId}"></canvas>
        `;
    }
}

// Hiển thị thông báo lỗi
function showErrorMessage(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        const container = canvas.parentElement;
        container.innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="fas fa-exclamation-triangle"></i> ${message}
            </div>
            <canvas id="${canvasId}"></canvas>
        `;
    }
}

// Event handlers
$(document).ready(function() {
    console.log('Revenue page loaded');
    
    $('#dateFilterForm').submit(function (e) {
        e.preventDefault();
        console.log('Date filter form submitted');
        loadRevenueReports();
    });
});

// Cleanup function khi rời khỏi trang
window.addEventListener('beforeunload', function() {
    if (dailyChart) dailyChart.destroy();
    if (monthlyChart) monthlyChart.destroy();
    if (yearlyChart) yearlyChart.destroy();
});