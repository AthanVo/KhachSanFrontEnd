// Đăng Nhập
const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

signUpButton.addEventListener('click', () => {
    container.classList.add('right-panel-active');
});

signInButton.addEventListener('click', () => {
    container.classList.remove('right-panel-active');
});

// Handle sign-in form submission
document.getElementById("signin-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const tenDN = document.getElementById("signin-TenDN").value.trim();
    const matKhau = document.getElementById("signin-MatKhau").value;
    const rememberMe = document.getElementById("RememberMe").checked;
    const messageElement = document.getElementById("signin-message");

    // Clear previous messages
    messageElement.innerText = "";

    // Client-side validation
    if (!tenDN || !matKhau) {
        messageElement.innerText = "Vui lòng nhập đầy đủ thông tin";
        messageElement.style.color = "red";
        return;
    }

    // Show loading message
    messageElement.innerText = "Đang đăng nhập...";
    messageElement.style.color = "blue";

    try {
        console.log("Sending login request...");
        const response = await fetch("http://localhost:5000/api/Auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ tenDN, matKhau, rememberMe })
        });

        console.log("Response status:", response.status);
        const result = await response.json();
        console.log("Response data:", result);

        if (response.ok && result.success) {
            // Store user data in localStorage
            localStorage.setItem("jwtToken", result.token);
            localStorage.setItem("tenDangNhap", result.username);
            localStorage.setItem("vaitro", result.vaitro);
            localStorage.setItem("hoTen", result.hoTen);

            console.log("Login successful, stored data:");
            console.log("Token:", localStorage.getItem("jwtToken"));
            console.log("Username:", localStorage.getItem("tenDangNhap"));
            console.log("Role:", localStorage.getItem("vaitro"));
            console.log("Full name:", localStorage.getItem("hoTen"));

            messageElement.innerText = "Đăng nhập thành công! Đang chuyển hướng...";
            messageElement.style.color = "green";

            // Redirect after 1.5 seconds
            setTimeout(() => {
                console.log("Redirecting to khachsan.html...");
                window.location.href = "index.html";
            }, 1500);
        } else {
            messageElement.innerText = result.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";
            messageElement.style.color = "red";
        }
    } catch (error) {
        console.error("Login error:", error);
        messageElement.innerText = "Lỗi kết nối. Vui lòng thử lại sau.";
        messageElement.style.color = "red";
    }
});

// Handle sign-up form submission
document.getElementById("signup-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const hotenKH = document.getElementById("signup-HotenKH").value.trim();
    const tenDN = document.getElementById("signup-TenDN").value.trim();
    const matKhau = document.getElementById("signup-MatKhau").value;
    const matkhaunhaplai = document.getElementById("signup-Matkhaunhaplai").value;
    const email = document.getElementById("signup-Email").value.trim();
    const dienthoai = document.getElementById("signup-Dienthoai").value.trim();
    const messageElement = document.getElementById("signup-message");

    // Clear previous messages
    messageElement.innerText = "";

    // Client-side validation
    if (!hotenKH || !tenDN || !matKhau || !matkhaunhaplai || !email || !dienthoai) {
        messageElement.innerText = "Vui lòng nhập đầy đủ thông tin";
        messageElement.style.color = "red";
        return;
    }

    if (matKhau !== matkhaunhaplai) {
        messageElement.innerText = "Mật khẩu nhập lại không khớp";
        messageElement.style.color = "red";
        return;
    }

    if (matKhau.length < 8) {
        messageElement.innerText = "Mật khẩu phải dài ít nhất 8 ký tự";
        messageElement.style.color = "red";
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        messageElement.innerText = "Email không hợp lệ";
        messageElement.style.color = "red";
        return;
    }

    // Phone validation - Vietnamese phone numbers
    if (!/^(0|\+84)[0-9]{9,10}$/.test(dienthoai)) {
        messageElement.innerText = "Số điện thoại không hợp lệ (10-11 chữ số)";
        messageElement.style.color = "red";
        return;
    }

    // Show loading message
    messageElement.innerText = "Đang đăng ký...";
    messageElement.style.color = "blue";

    try {
        console.log("Sending registration request...");
        const response = await fetch("http://localhost:5000/api/Auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                hotenKH,
                tenDN,
                matKhau,
                matkhaunhaplai,
                email,
                dienthoai
            })
        });

        console.log("Response status:", response.status);
        const result = await response.json();
        console.log("Response data:", result);

        if (response.ok && result.success) {
            messageElement.innerText = result.message || "Đăng ký thành công! Đang chuyển về đăng nhập...";
            messageElement.style.color = "green";

            // Clear form
            document.getElementById("signup-form").reset();

            // Switch to sign-in panel after 2 seconds
            setTimeout(() => {
                container.classList.remove('right-panel-active');
                messageElement.innerText = "";

                // Show success message on sign-in panel
                const signinMessage = document.getElementById("signin-message");
                signinMessage.innerText = "Đăng ký thành công! Vui lòng đăng nhập.";
                signinMessage.style.color = "green";

                // Clear sign-in success message after 3 seconds
                setTimeout(() => {
                    signinMessage.innerText = "";
                }, 3000);
            }, 2000);
        } else {
            messageElement.innerText = result.message || "Đăng ký thất bại. Vui lòng thử lại.";
            messageElement.style.color = "red";
        }
    } catch (error) {
        console.error("Registration error:", error);
        messageElement.innerText = "Lỗi kết nối. Vui lòng thử lại sau.";
        messageElement.style.color = "red";
    }
});
// Đăng ký

document.getElementById("register-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const hotenKH = document.getElementById("HotenKH").value;
    const tenDN = document.getElementById("TenDN").value;
    const matKhau = document.getElementById("MatKhau").value;
    const matkhaunhaplai = document.getElementById("Matkhaunhaplai").value;
    const email = document.getElementById("Email").value;
    const dienthoai = document.getElementById("Dienthoai").value;
    const messageElement = document.getElementById("message");

    // Validate client-side
    if (!hotenKH || !tenDN || !matKhau || !matkhaunhaplai || !email || !dienthoai) {
        messageElement.innerText = "Vui lòng nhập đầy đủ thông tin";
        messageElement.style.color = "red";
        return;
    }

    if (matKhau !== matkhaunhaplai) {
        messageElement.innerText = "Mật khẩu nhập lại không khớp";
        messageElement.style.color = "red";
        return;
    }

    if (matKhau.length < 8) {
        messageElement.innerText = "Mật khẩu phải dài ít nhất 8 ký tự";
        messageElement.style.color = "red";
        return;
    }

    if (!/^\d{10,11}$/.test(dienthoai)) {
        messageElement.innerText = "Số điện thoại phải là 10 hoặc 11 chữ số";
        messageElement.style.color = "red";
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/api/Auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ hotenKH, tenDN, matKhau, matkhaunhaplai, email, dienthoai })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            messageElement.innerText = result.message || "Đăng ký thành công! Chuyển tới đăng nhập...";
            messageElement.style.color = "green";
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);
        } else {
            messageElement.innerText = result.message || "Đăng ký thất bại";
            messageElement.style.color = "red";
        }
    } catch (error) {
        messageElement.innerText = "Lỗi kết nối: " + error.message;
        messageElement.style.color = "red";
    }
});