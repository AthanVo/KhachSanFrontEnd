// config.js - Cấu hình URL API
const API_CONFIG = {
    // Thay đổi URL này theo backend của bạn
    BASE_URL: 'https://localhost:5001', // Hoặc http://localhost:5000

    // Các endpoint API
    ENDPOINTS: {
        REVENUE_REPORT: '/api/HotelManager/Reports/Revenue',
        TOTAL_REVENUE: '/api/HotelManager/Reports/TotalRevenue',
        ROOM_STATUS: '/api/HotelManager/Reports/RoomStatus',
        // Thêm các endpoint khác nếu cần
    }
};

// Hàm helper để tạo URL đầy đủ
function getApiUrl(endpoint) {
    return API_CONFIG.BASE_URL + endpoint;
}

// Export để sử dụng trong các file khác
window.API_CONFIG = API_CONFIG;
window.getApiUrl = getApiUrl;