// src/Components/Auth/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/login" : "/register";
      const payload = isLogin
        ? { emailOrUsername: form.email || form.username, password: form.password }
        : form;

      const res = await axios.post(
        `http://localhost:5000/api/auth${endpoint}`,
        payload
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Immediate navigation
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md border border-zinc-100">
        <div className="flex justify-center mb-6">
          <img src="/Catalyst_Logo_Black.png" alt="Catalyst Logo" width={120} />
        </div>

        <h2 className="text-lg sf-regular text-center tracking-tight mb-8">
          {isLogin ? "Welcome back" : "Create your account"}
        </h2>

        {error && (
          <p className="text-red-600 text-sm sf-regular tracking-tight text-center mb-6 bg-red-50 py-2.5 rounded-2xl">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sf-regular tracking-tight">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <input name="firstName" placeholder="First name" value={form.firstName} onChange={handleChange} required className="w-full px-5 py-2 bg-neutral-100 rounded-lg focus:outline-none" />
                <input name="lastName" placeholder="Last name" value={form.lastName} onChange={handleChange} required className="w-full px-5 py-2 bg-neutral-100 rounded-lg focus:outline-none" />
              </div>
              <input name="username" placeholder="Username" value={form.username} onChange={handleChange} required className="w-full px-5 py-2 bg-neutral-100 rounded-lg focus:outline-none" />
            </>
          )}

          <input name="email" type="email" placeholder={isLogin ? "Email or username" : "Email address"} value={form.email} onChange={handleChange} required className="w-full px-4 py-2 bg-neutral-100 rounded-lg focus:outline-none" />

          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required className="w-full px-4 py-2 bg-neutral-100 rounded-lg focus:outline-none" />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-neutral-900 text-white py-2 rounded-lg text-base transition-all duration-200 mt-2 disabled:opacity-70"
          >
            {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-center mt-8 text-neutral-500 sf-regular tracking-tight">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-black hover:underline">
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;