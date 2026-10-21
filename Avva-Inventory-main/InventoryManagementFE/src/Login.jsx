import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import logo from "./assets/logo.jpeg";
import { API_BASE_URL } from "./utils/api";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      // First try employee login
      console.log("Attempting employee login...");
      const employeeResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important: Include cookies for session
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const employeeData = await employeeResponse.json();

      if (employeeResponse.ok && employeeData.user) {
        // Employee login successful
        console.log("Employee login successful:", employeeData);

        // Store user details in localStorage
        localStorage.setItem("user", JSON.stringify(employeeData.user));
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("loginType", "employee");

        // Also store session info
        if (employeeData.user.user_type) {
          localStorage.setItem("userType", employeeData.user.user_type);
        }
        if (employeeData.user.current_company) {
          localStorage.setItem("company", employeeData.user.current_company);
        }

        setLoading(false);
        navigate("/dashboard");
        return;
      }

      // If employee login fails, try the old login endpoint
      console.log("Employee login failed, trying old login endpoint...");
      const oldResponse = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const oldData = await oldResponse.json();

      if (!oldResponse.ok) {
        setError(oldData.error || "Invalid email or password");
        setLoading(false);
        return;
      }

      // Standard login successful
      console.log("Standard login successful:", oldData);

      // Store user details in localStorage with proper structure
      const userData = oldData.user || oldData;
      const userToStore = {
        id: userData.id || userData.user_id,
        employee_id: userData.employee_id || userData.emp_id || null,
        full_name: userData.full_name || userData.name || userData.username,
        email: userData.email,
        user_type: userData.user_type || userData.role || "user",
        permissions: userData.permissions || [],
        department: userData.department || null,
        designation: userData.designation || null,
        current_company: userData.current_company || userData.company || null,
        phone_number: userData.phone_number || userData.phone || null,
        blood_group: userData.blood_group || null
      };

      localStorage.setItem("user", JSON.stringify(userToStore));
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("loginType", "standard");

      setLoading(false);
      navigate("/dashboard");

    } catch (err) {
      console.error("Login error:", err);
      setError("Server error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setError("");
    setInfoMessage("Please contact the administrator to reset your password.");
  };

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <div style={styles.logoContainer}>
          <img src={logo} alt="Avva Inventory Logo" style={styles.logo} />
        </div>
        <h2 style={styles.title}></h2>
        <h2 style={styles.title}></h2>
        <p style={styles.subtitle}>Please login to continue</p>

        {error && <p style={styles.error}>{error}</p>}
        {infoMessage && <p style={styles.info}>{infoMessage}</p>}

        <div style={styles.inputGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Password</label>

          <div style={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.passwordInput}
            />
            <span
              style={styles.eyeIcon}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
        </div>

        <div style={styles.forgotWrapper}>
          <span style={styles.forgot} onClick={handleForgotPassword}>
            Forgot Password?
          </span>
        </div>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
  },
  form: {
    background: "#1e1e2f",
    padding: "35px",
    borderRadius: "12px",
    width: "360px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    color: "#fff",
  },
  title: {
    textAlign: "center",
    marginBottom: "5px",
    marginTop: "10px",
  },
  logoContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "20px",
  },
  logo: {
    width: "120px",
    height: "auto",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
  },
  subtitle: {
    textAlign: "center",
    fontSize: "14px",
    marginBottom: "20px",
    color: "#aaa",
  },
  inputGroup: {
    marginBottom: "18px",
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "14px",
    marginBottom: "6px",
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #444",
    backgroundColor: "#2a2a40",
    color: "#fff",
    outline: "none",
  },
  passwordWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  passwordInput: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #444",
    backgroundColor: "#2a2a40",
    color: "#fff",
    outline: "none",
  },
  eyeIcon: {
    position: "absolute",
    right: "10px",
    cursor: "pointer",
    color: "#aaa",
  },
  forgotWrapper: {
    textAlign: "right",
    marginBottom: "15px",
  },
  forgot: {
    fontSize: "13px",
    color: "#4da6ff",
    cursor: "pointer",
  },
  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#4da6ff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "0.3s",
  },
  error: {
    color: "#ff4d4d",
    fontSize: "14px",
    marginBottom: "10px",
  },
  info: {
    color: "#4da6ff",
    fontSize: "14px",
    marginBottom: "10px",
  },
};

export default Login;